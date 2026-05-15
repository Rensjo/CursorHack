use clap::Parser;
use hound::{SampleFormat, WavSpec, WavWriter};
use image::GenericImageView;
use image::imageops::grayscale;
use img_hash::{FilterType, HashAlg, HasherConfig, ImageHash};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};
use std::fs::{File, OpenOptions};
use std::io::{BufRead, BufReader, Read, Write};
use std::path::Path;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    #[arg(short, long)]
    image: String,

    #[arg(short, long, default_value = "evidence.wav")]
    output: String,

    #[arg(short, long, default_value = "3")]
    levels: usize,

    /// Verify image against stored hash (base64 format)
    #[arg(long)]
    verify_against: Option<String>,

    /// Owner name for blockchain record
    #[arg(long, default_value = "Anonymous")]
    owner: String,

    /// Verify blockchain integrity
    #[arg(long)]
    verify_chain: bool,

    /// Base tile size in pixels (will create overlapping tiles)
    /// Recommended: 128 for normal images, 64-96 for small crops/avatars
    #[arg(long, default_value = "128")]
    tile_size: u32,

    /// Overlap percentage for tiles (0-90)
    #[arg(long, default_value = "50")]
    tile_overlap: u32,

    /// Minimum tile matches required for detection (default: 15% of query tiles)
    #[arg(long)]
    min_tile_matches: Option<usize>,

    /// Hash algorithm: blockhash, gradient, meanhash
    #[arg(long, default_value = "gradient")]
    hash_algorithm: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct TileHash {
    x: u32,
    y: u32,
    width: u32,
    height: u32,
    hash: String,
    #[serde(default)]
    scale_level: u32,
}

#[derive(Debug, Serialize, Deserialize)]
struct ImageMetadata {
    width: u32,
    height: u32,
    #[serde(default)]
    tile_count: usize,
}

#[derive(Debug, Serialize, Deserialize)]
struct BlockchainRecord {
    block_id: usize,
    timestamp: String,
    image_hash: String,
    #[serde(default)]
    tile_hashes: Vec<TileHash>,
    #[serde(default)]
    metadata: Option<ImageMetadata>,
    audio_hash: String,
    owner: String,
    previous_hash: String,
}

impl BlockchainRecord {
    fn compute_hash(&self) -> String {
        let mut hasher = Sha256::new();
        let tile_data = self
            .tile_hashes
            .iter()
            .map(|t| format!("{}-{}-{}-{}-{}", t.x, t.y, t.width, t.height, t.hash))
            .collect::<Vec<_>>()
            .join(",");
        let data = format!(
            "{}{}{}{}{}{}{}",
            self.block_id,
            self.timestamp,
            self.image_hash,
            tile_data,
            self.audio_hash,
            self.owner,
            self.previous_hash
        );
        hasher.update(data.as_bytes());
        hex::encode(hasher.finalize())
    }
}

struct DummyBlockchain {
    chain_file: String,
}

impl DummyBlockchain {
    fn new(file: &str) -> Self {
        Self {
            chain_file: file.to_string(),
        }
    }

    fn get_last_hash(&self) -> String {
        if let Ok(file) = File::open(&self.chain_file) {
            let reader = BufReader::new(file);
            if let Some(Ok(last_line)) = reader.lines().last() {
                if let Ok(record) = serde_json::from_str::<BlockchainRecord>(&last_line) {
                    return record.compute_hash();
                }
            }
        }
        "0".repeat(64)
    }

    fn get_chain_length(&self) -> usize {
        if let Ok(file) = File::open(&self.chain_file) {
            BufReader::new(file).lines().count()
        } else {
            0
        }
    }

    fn add_record(
        &self,
        image_hash: &str,
        tile_hashes: Vec<TileHash>,
        metadata: ImageMetadata,
        audio_hash: &str,
        owner: &str,
    ) -> Result<BlockchainRecord, Box<dyn std::error::Error>> {
        let previous_hash = self.get_last_hash();
        let block_id = self.get_chain_length();

        let record = BlockchainRecord {
            block_id,
            timestamp: chrono::Utc::now().to_rfc3339(),
            image_hash: image_hash.to_string(),
            tile_hashes,
            metadata: Some(metadata),
            audio_hash: audio_hash.to_string(),
            owner: owner.to_string(),
            previous_hash: previous_hash.clone(),
        };

        let record_hash = record.compute_hash();

        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.chain_file)?;

        writeln!(file, "{}", serde_json::to_string(&record)?)?;

        println!("\n[LAYER 4: BLOCKCHAIN LEDGER]");
        println!("   Block ID: #{}", record.block_id);
        println!(
            "   Block Hash: {}...{}",
            &record_hash[..8],
            &record_hash[56..]
        );
        println!(
            "   Previous: {}...{}",
            &previous_hash[..8],
            &previous_hash[56..]
        );
        println!("   Owner: {}", owner);

        Ok(record)
    }

    fn verify_chain(&self) -> Result<bool, Box<dyn std::error::Error>> {
        let file = File::open(&self.chain_file)?;
        let reader = BufReader::new(file);
        let mut previous_hash = "0".repeat(64);

        println!("\n=== BLOCKCHAIN INTEGRITY CHECK ===\n");

        for (idx, line) in reader.lines().enumerate() {
            let record: BlockchainRecord = serde_json::from_str(&line?)?;
            let computed_hash = record.compute_hash();

            print!("Block #{}: ", idx);

            if record.previous_hash != previous_hash {
                println!("✗ INVALID - Previous hash mismatch");
                return Ok(false);
            }

            println!("✓ Valid");
            previous_hash = computed_hash;
        }

        println!("\n✓ Blockchain integrity verified!");
        println!("Total blocks: {}", self.get_chain_length());

        Ok(true)
    }

    fn find_matching_records(
        &self,
        query_img: &image::DynamicImage, // pass the actual image, not pre-computed tiles
        min_matches: usize,
        target_hash: Option<&str>,
        tile_size: u32,
        overlap_percent: u32,
        hash_alg: &str,
    ) -> Result<Vec<MatchResult>, Box<dyn std::error::Error>> {
        let file = File::open(&self.chain_file)?;
        let reader = BufReader::new(file);
        let mut all_matches = Vec::new();

        for (block_idx, line) in reader.lines().enumerate() {
            let record: BlockchainRecord = serde_json::from_str(&line?)?;

            if record.tile_hashes.is_empty() {
                continue;
            }

            if let Some(target) = target_hash {
                if record.image_hash != target {
                    continue;
                }
            }

            let stored_w = record.metadata.as_ref().map(|m| m.width).unwrap_or(0);
            let stored_h = record.metadata.as_ref().map(|m| m.height).unwrap_or(0);

            if stored_w == 0 || stored_h == 0 {
                continue;
            }

            println!(
                "\n   Checking Block #{} ({}×{}, {} tiles)...",
                block_idx,
                stored_w,
                stored_h,
                record.tile_hashes.len()
            );

            // Physically resize query to match stored image dimensions
            // This handles all aspect ratio and scale differences correctly
            let resized_query =
                query_img.resize_exact(stored_w, stored_h, image::imageops::FilterType::Lanczos3);

            // Use smaller tiles if image is small
            let effective_tile_size = if stored_w < 256 || stored_h < 256 {
                tile_size / 2
            } else {
                tile_size
            };

            let query_tiles = compute_tile_hashes(
                &resized_query,
                effective_tile_size,
                overlap_percent,
                hash_alg,
            )?;

            println!("      Query tiles after resize: {}", query_tiles.len());

            let hash_bits = (HASH_SIZE * HASH_SIZE) as f32;

            // More lenient threshold for re-compressed/edited images
            let per_tile_threshold = (hash_bits * 0.40).ceil() as u32;

            println!(
                "      Per-tile threshold: {} bits ({:.0}%)",
                per_tile_threshold,
                (per_tile_threshold as f32 / hash_bits) * 100.0
            );

            // Build stored hash map
            let stored_hash_map: HashMap<usize, ImageHash<Vec<u8>>> = record
                .tile_hashes
                .iter()
                .enumerate()
                .filter_map(|(idx, t)| {
                    ImageHash::<Vec<u8>>::from_base64(&t.hash)
                        .ok()
                        .map(|h| (idx, h))
                })
                .collect();

            // Build query hash map
            let query_hash_map: HashMap<usize, ImageHash<Vec<u8>>> = query_tiles
                .iter()
                .enumerate()
                .filter_map(|(idx, t)| {
                    ImageHash::<Vec<u8>>::from_base64(&t.hash)
                        .ok()
                        .map(|h| (idx, h))
                })
                .collect();

            let mut raw_matches: Vec<TileMatch> = Vec::new();

            for (&q_idx, q_hash) in &query_hash_map {
                for (&s_idx, s_hash) in &stored_hash_map {
                    let dist = q_hash.dist(s_hash);
                    if dist <= per_tile_threshold {
                        raw_matches.push(TileMatch {
                            query_idx: q_idx,
                            stored_idx: s_idx,
                            distance: dist,
                            query_tile: query_tiles[q_idx].clone(),
                            stored_tile: record.tile_hashes[s_idx].clone(),
                        });
                    }
                }
            }

            if raw_matches.is_empty() {
                println!("      No tile matches found");
                continue;
            }

            // Deduplicate: each stored tile claimed by best query match only
            let mut best_for_stored: HashMap<usize, TileMatch> = HashMap::new();
            for m in raw_matches {
                let entry = best_for_stored
                    .entry(m.stored_idx)
                    .or_insert_with(|| m.clone());
                if m.distance < entry.distance {
                    *entry = m;
                }
            }
            // Also deduplicate query side
            let mut best_for_query: HashMap<usize, TileMatch> = HashMap::new();
            for m in best_for_stored.into_values() {
                let entry = best_for_query
                    .entry(m.query_idx)
                    .or_insert_with(|| m.clone());
                if m.distance < entry.distance {
                    *entry = m;
                }
            }
            let matches: Vec<TileMatch> = best_for_query.into_values().collect();

            println!("      Raw matches (deduped): {}", matches.len());

            let clusters = find_tile_clusters(&matches, &query_tiles, tile_size);

            println!("      Clusters found: {}", clusters.len());
            if !clusters.is_empty() {
                println!("      Cluster breakdown:");
                for (i, cluster) in clusters.iter().enumerate() {
                    let avg_dist: f32 = cluster.iter().map(|m| m.distance as f32).sum::<f32>()
                        / cluster.len() as f32;
                    println!(
                        "         Cluster {}: {} tiles (avg_dist={:.1})",
                        i,
                        cluster.len(),
                        avg_dist
                    );
                }
            }

            let per_cluster_min = min_matches.min(5).max(3);

            for cluster in &clusters {
                if cluster.len() >= per_cluster_min {
                    let avg_dist: f32 = cluster.iter().map(|m| m.distance as f32).sum::<f32>()
                        / cluster.len() as f32;
                    let confidence =
                        calculate_confidence(cluster.len(), query_tiles.len(), avg_dist, hash_bits);
                    println!(
                        "      ✅ Cluster: {} tiles, avg_dist: {:.1}, confidence: {:.1}%",
                        cluster.len(),
                        avg_dist,
                        confidence * 100.0
                    );
                    all_matches.push(MatchResult {
                        block_id: block_idx,
                        image_hash: record.image_hash.clone(),
                        match_count: cluster.len(),
                        matches: cluster.clone(),
                        confidence,
                    });
                }
            }
        }

        Ok(all_matches)
    }
}

#[derive(Debug, Clone)]
struct TileMatch {
    query_idx: usize,
    #[allow(dead_code)]
    stored_idx: usize,
    distance: u32,
    query_tile: TileHash,
    stored_tile: TileHash,
}

#[derive(Debug)]
struct MatchResult {
    block_id: usize,
    #[allow(dead_code)]
    image_hash: String,
    match_count: usize,
    matches: Vec<TileMatch>,
    confidence: f32,
}

fn find_tile_clusters(
    matches: &[TileMatch],
    query_tiles: &[TileHash],
    tile_size: u32,
) -> Vec<Vec<TileMatch>> {
    let mut clusters = Vec::new();
    let mut used_query_indices = HashSet::new();

    let mut sorted_matches = matches.to_vec();
    sorted_matches.sort_by_key(|m| m.distance);

    for seed_match in &sorted_matches {
        if used_query_indices.contains(&seed_match.query_idx) {
            continue;
        }

        let mut cluster = vec![seed_match.clone()];
        used_query_indices.insert(seed_match.query_idx);

        for candidate in &sorted_matches {
            if used_query_indices.contains(&candidate.query_idx) {
                continue;
            }

            let candidate_tile = &query_tiles[candidate.query_idx];

            let is_near = cluster.iter().any(|cm| {
                let ct = &query_tiles[cm.query_idx];
                let dx = (candidate_tile.x as i32 - ct.x as i32).abs();
                let dy = (candidate_tile.y as i32 - ct.y as i32).abs();
                let max_dist = (tile_size as f32 * 2.0) as i32;
                dx <= max_dist && dy <= max_dist
            });

            if is_near && candidate.distance <= seed_match.distance * 2 {
                cluster.push(candidate.clone());
                used_query_indices.insert(candidate.query_idx);
            }
        }

        if cluster.len() >= 2 {
            clusters.push(cluster);
        }
    }

    clusters.sort_by_key(|c| std::cmp::Reverse(c.len()));
    clusters
}

fn calculate_confidence(
    match_count: usize,
    total_query_tiles: usize,
    avg_distance: f32,
    hash_bits: f32,
) -> f32 {
    // Confidence based on:
    // 1. Percentage of tiles matched
    // 2. Quality of matches (low distance = high quality)
    // 3. Bonus for perfect/near-perfect matches

    let coverage = match_count as f32 / total_query_tiles as f32;
    let quality = 1.0 - (avg_distance / hash_bits).min(1.0);

    // For crops, even 25% coverage with high quality is strong evidence
    // Adjust the baseline confidence for crop scenarios
    let base_confidence = coverage * 0.5 + quality * 0.5;

    // Bonus for high-quality matches (distance near 0)
    let quality_bonus = if avg_distance < 5.0 {
        0.2 * (1.0 - avg_distance / 5.0)
    } else {
        0.0
    };

    // Bonus for sufficient coverage (25%+ is strong for crops)
    let coverage_bonus = if coverage >= 0.25 { 0.1 } else { 0.0 };

    (base_confidence + quality_bonus + coverage_bonus).min(1.0)
}

const HASH_SIZE: u32 = 16; // Smaller hash for better performance

fn get_hash_algorithm(name: &str) -> HashAlg {
    match name.to_lowercase().as_str() {
        "blockhash" => HashAlg::Blockhash,
        "gradient" => HashAlg::Gradient,
        "meanhash" | "mean" => HashAlg::Mean,
        "vertgradient" => HashAlg::VertGradient,
        "doublegradient" => HashAlg::DoubleGradient,
        _ => {
            println!("   Unknown hash algorithm '{}', using Gradient", name);
            HashAlg::Gradient
        }
    }
}

fn compute_tile_hashes(
    img: &image::DynamicImage,
    tile_size: u32,
    overlap_percent: u32,
    hash_alg: &str,
) -> Result<Vec<TileHash>, Box<dyn std::error::Error>> {
    let (img_width, img_height) = img.dimensions();

    let overlap_percent = overlap_percent.min(90);
    let step = ((100 - overlap_percent) as f32 / 100.0 * tile_size as f32) as u32;
    let step = step.max(1);

    let hasher = HasherConfig::new()
        .hash_alg(get_hash_algorithm(hash_alg))
        .hash_size(HASH_SIZE, HASH_SIZE)
        .to_hasher();

    let mut tile_hashes = Vec::new();

    println!("\n[TILE-BASED ANALYSIS]");
    println!("   Algorithm: {:?}", get_hash_algorithm(hash_alg));
    println!("   Image size: {}×{}", img_width, img_height);
    println!("   Tile size: {}×{} pixels", tile_size, tile_size);
    println!("   Overlap: {}% (step: {} pixels)", overlap_percent, step);

    let mut y = 0;
    while y < img_height {
        let mut x = 0;
        while x < img_width {
            let actual_width = tile_size.min(img_width - x);
            let actual_height = tile_size.min(img_height - y);

            // Skip if tile is too small
            if actual_width < tile_size / 2 || actual_height < tile_size / 2 {
                x += step;
                continue;
            }

            let tile = img.crop_imm(x, y, actual_width, actual_height);

            // Normalize to square
            let norm_size = 128u32;
            let resized = image::DynamicImage::ImageRgba8(image::imageops::resize(
                &tile,
                norm_size,
                norm_size,
                FilterType::Lanczos3,
            ));

            // Check variance
            let gray = grayscale(&resized);
            let mut sum: f64 = 0.0;
            let mut sum_sq: f64 = 0.0;
            let count = (norm_size * norm_size) as f64;

            for pixel in gray.pixels() {
                let v = pixel[0] as f64;
                sum += v;
                sum_sq += v * v;
            }

            let mean = sum / count;
            let variance = (sum_sq / count) - mean.powi(2);

            // Lower variance threshold since we have more tiles
            if variance < 200.0 {
                x += step;
                continue;
            }

            let tile_hash = hasher.hash_image(&resized);

            tile_hashes.push(TileHash {
                x,
                y,
                width: actual_width,
                height: actual_height,
                hash: tile_hash.to_base64(),
                scale_level: 0,
            });

            x += step;
        }
        y += step;
    }

    println!("   ✓ {} tile hashes computed", tile_hashes.len());

    Ok(tile_hashes)
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();

    if args.verify_chain {
        let blockchain = DummyBlockchain::new("image_blockchain.jsonl");
        blockchain.verify_chain()?;
        return Ok(());
    }

    let img_path = Path::new(&args.image);
    let img = image::open(img_path).expect("Failed to open image");

    println!("\n=== IMAGE OWNERSHIP & FORENSIC SYSTEM ===");
    println!(
        "Processing: {} ({}×{})",
        args.image,
        img.width(),
        img.height()
    );

    let hasher = HasherConfig::new()
        .hash_alg(get_hash_algorithm(&args.hash_algorithm))
        .hash_size(32, 32)
        .to_hasher();

    let phash = hasher.hash_image(&img);

    // vergil-edited is 225px wide, original is 637px wide
    // ratio ≈ 2.83x, so upscale query by ~2x and ~3x
    let tile_hashes = if args.verify_against.is_some() {
        // Use only scale 1.0 (original) — remapping happens inside find_matching_records
        compute_tile_hashes(
            &img,
            args.tile_size,
            args.tile_overlap,
            &args.hash_algorithm,
        )?
    } else {
        compute_tile_hashes(
            &img,
            args.tile_size,
            args.tile_overlap,
            &args.hash_algorithm,
        )?
    };
    let total_tiles = tile_hashes.len();

    // Default: 15% of tiles must match
    let min_matches = args
        .min_tile_matches
        .unwrap_or((total_tiles as f32 * 0.15).ceil() as usize)
        .max(3);

    let metadata = ImageMetadata {
        width: img.width(),
        height: img.height(),
        tile_count: total_tiles,
    };

    if let Some(ref stored_hash_b64) = args.verify_against {
        println!("\n=== OWNERSHIP VERIFICATION MODE ===\n");

        match ImageHash::from_base64(stored_hash_b64) {
            Ok(stored_hash) => {
                let distance = phash.dist(&stored_hash);
                let hash_bits = stored_hash.as_bytes().len() * 8;
                let similarity = 1.0 - (distance as f32 / hash_bits as f32);

                println!("Full Image Hash Comparison:");
                println!("   Query Hash:  {}", phash.to_base64());
                println!("   Stored Hash: {}", stored_hash_b64);
                println!("   Hamming Distance: {}", distance);
                println!("   Similarity: {:.2}%", similarity * 100.0);

                if distance <= 10 {
                    println!("\n✓ FULL IMAGE MATCH CONFIRMED");
                } else {
                    println!("\n⚠ Full hash differs - checking tile matches...");
                }
            }
            Err(e) => {
                println!("✗ Error parsing stored hash: {:?}", e);
            }
        }

        println!("\n[TILE-BASED VERIFICATION]");
        println!(
            "   Minimum tile matches required: {} ({:.1}%)",
            min_matches,
            (min_matches as f32 / total_tiles as f32) * 100.0
        );

        let blockchain = DummyBlockchain::new("image_blockchain.jsonl");

        if !Path::new("image_blockchain.jsonl").exists() {
            println!("✗ No blockchain file found");
            return Ok(());
        }

        // Replace the find_matching_records call with:
        let matches = blockchain.find_matching_records(
            &img,
            min_matches,
            Some(stored_hash_b64),
            args.tile_size,
            args.tile_overlap,
            &args.hash_algorithm,
        )?;

        if !matches.is_empty() {
            println!("\n✅ MATCHES FOUND");

            // Group matches by block and keep only the best match per block
            let mut best_matches: HashMap<usize, &MatchResult> = HashMap::new();
            for match_result in &matches {
                let current_best = best_matches.get(&match_result.block_id);
                let should_replace =
                    current_best.map_or(true, |best| match_result.confidence > best.confidence);

                if should_replace {
                    best_matches.insert(match_result.block_id, match_result);
                }
            }

            // Sort by confidence (highest first)
            let mut sorted_matches: Vec<_> = best_matches.values().collect();
            sorted_matches.sort_by(|a, b| b.confidence.partial_cmp(&a.confidence).unwrap());

            for match_result in sorted_matches.iter() {
                println!(
                    "\n   Block #{}: {} tiles matched",
                    match_result.block_id, match_result.match_count,
                );
                println!("   Confidence: {:.1}%", match_result.confidence * 100.0);

                // Show sample matches
                println!("   Sample tile positions (query → stored):");
                for tile_match in match_result.matches.iter().take(5) {
                    println!(
                        "      [{},{}] {}×{} → [{},{}] {}×{} (distance: {})",
                        tile_match.query_tile.x,
                        tile_match.query_tile.y,
                        tile_match.query_tile.width,
                        tile_match.query_tile.height,
                        tile_match.stored_tile.x,
                        tile_match.stored_tile.y,
                        tile_match.stored_tile.width,
                        tile_match.stored_tile.height,
                        tile_match.distance
                    );
                }
                if match_result.matches.len() > 5 {
                    println!("      ... and {} more", match_result.matches.len() - 5);
                }

                if match_result.confidence > 0.75 {
                    println!("\n   ✅ HIGH CONFIDENCE: Strong evidence of match");
                    println!(
                        "      This is very likely a crop or derivative of the registered image"
                    );
                } else if match_result.confidence > 0.55 {
                    println!("\n   ✅ GOOD CONFIDENCE: Probable match");
                    println!("      Strong evidence this is related to the registered image");
                } else if match_result.confidence > 0.35 {
                    println!("\n   ⚠ MEDIUM CONFIDENCE: Possible match, review recommended");
                } else {
                    println!("\n   ⚠ LOW CONFIDENCE: Weak match, may be false positive");
                }
            }

            // Add interpretation summary
            let best_match = sorted_matches.first().unwrap();
            println!("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            println!("INTERPRETATION:");

            if best_match.confidence > 0.75 {
                println!("✅ This image is very likely derived from the registered image.");
                println!(
                    "   The high match quality suggests this is a crop, resize, or minor edit."
                );
            } else if best_match.confidence > 0.55 {
                println!("✅ This image appears to be related to the registered image.");
                println!("   Evidence suggests a crop, partial copy, or derivative work.");
            } else if best_match.confidence > 0.35 {
                println!("⚠ Possible relationship detected but uncertain.");
                println!("   Manual review recommended before drawing conclusions.");
            } else {
                println!("⚠ Weak similarity detected.");
                println!("   May be coincidental or a heavily modified derivative.");
            }

            // Explain the numbers
            let best_coverage = best_match.confidence;
            if best_coverage >= 0.5 {
                println!("\n   Note: >50% tile coverage indicates substantial overlap");
            } else if best_coverage >= 0.25 {
                println!("\n   Note: 25-50% tile coverage is typical for significant crops");
            } else {
                println!("\n   Note: <25% tile coverage suggests small portion or weak match");
            }
            println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        } else {
            println!("\n⚠ NO MATCHES FOUND");
            println!("   This image does not appear to match the stored image");
        }

        return Ok(());
    }

    println!("\n[LAYER 1: OWNERSHIP IDENTIFIER]");
    println!("   Full Image Hash: {}", phash.to_base64());
    println!("   Hash Size: {} bits", phash.as_bytes().len() * 8);

    let process_size = 512;
    let resized = img.resize_exact(process_size, process_size, FilterType::Nearest);
    let gray = resized.to_luma8();

    println!("\n[LAYER 2: FORENSIC ANALYSIS]");
    println!("   Method: 2D Discrete Wavelet Transform (Haar)");
    println!("   Decomposition levels: {}", args.levels);

    let mut matrix: Vec<Vec<f32>> = (0..process_size)
        .map(|y| {
            (0..process_size)
                .map(|x| gray.get_pixel(x, y)[0] as f32)
                .collect()
        })
        .collect();

    let subbands = decompose_2d_dwt(&mut matrix, args.levels);
    println!("   Subbands extracted: {}", subbands.len());

    println!("\n[LAYER 3: AUDIO SIGNATURE]");
    generate_audio_signature(&subbands, &args.output)?;

    let mut file = File::open(&args.output)?;
    let mut sha = Sha256::new();
    let mut buf = [0; 1024];
    while let Ok(n) = file.read(&mut buf) {
        if n == 0 {
            break;
        }
        sha.update(&buf[..n]);
    }
    let audio_hash = hex::encode(sha.finalize());

    let blockchain = DummyBlockchain::new("image_blockchain.jsonl");
    blockchain.add_record(
        &phash.to_base64(),
        tile_hashes,
        metadata,
        &audio_hash,
        &args.owner,
    )?;

    println!("\n========================================");
    println!("✓ REGISTRATION COMPLETE");
    println!("========================================");
    println!("Image Hash: {}", phash.to_base64());
    println!("Audio File: {}", args.output);
    println!("Owner: {}", args.owner);
    println!("Tiles Registered: {}", total_tiles);
    println!("\nTo verify (including crops):");
    println!(
        "  cargo run -- --image <file> --verify-against \"{}\"",
        phash.to_base64()
    );
    println!("\nTo check blockchain:");
    println!("  cargo run -- --verify-chain");
    println!("========================================\n");

    Ok(())
}

fn generate_audio_signature(
    subbands: &[Vec<Vec<f32>>],
    output_path: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let sample_rate = 44100;
    let duration = 5.0;
    let total_samples = (sample_rate as f32 * duration) as usize;

    let spec = WavSpec {
        channels: 1,
        sample_rate,
        bits_per_sample: 16,
        sample_format: SampleFormat::Int,
    };

    let mut writer = WavWriter::create(output_path, spec)?;

    println!("   Generating {}-second audio signature...", duration);

    for t in 0..total_samples {
        let time = t as f32 / sample_rate as f32;
        let progress = t as f32 / total_samples as f32;
        let mut final_sample = 0.0;

        let ll_idx = subbands.len() - 1;
        let ll_val = get_spatial_pixel(&subbands[ll_idx], progress);
        let base_freq = 150.0 + (ll_val / 512.0 * 50.0);
        final_sample += (time * base_freq * 2.0 * std::f32::consts::PI).sin() * 0.3;

        for i in 0..subbands.len() - 1 {
            let detail_val = get_spatial_pixel(&subbands[i], progress);
            let intensity = (detail_val.abs() / 255.0).min(1.0);

            if intensity > 0.05 && intensity < 0.2 {
                let grit = (time * 400.0 * 2.0 * std::f32::consts::PI).sin().signum();
                final_sample += grit * 0.05;
            } else if intensity >= 0.2 {
                let detail_freq = 2000.0 + (i as f32 * 500.0);
                final_sample +=
                    (time * detail_freq * 2.0 * std::f32::consts::PI).sin() * intensity * 0.2;
            }
        }

        writer.write_sample((final_sample * i16::MAX as f32 * 0.8) as i16)?;
    }

    writer.finalize()?;
    println!("   ✓ Audio created: {}", output_path);

    Ok(())
}

fn decompose_2d_dwt(image: &mut Vec<Vec<f32>>, levels: usize) -> Vec<Vec<Vec<f32>>> {
    let mut subbands = Vec::new();
    let mut size = image.len();

    for _ in 0..levels {
        dwt_2d_step(image, size);
        let half = size / 2;

        subbands.push(extract_rect(image, 0, half, half, size));
        subbands.push(extract_rect(image, half, 0, size, half));
        subbands.push(extract_rect(image, half, half, size, size));

        size = half;
    }

    subbands.push(extract_rect(image, 0, 0, size, size));

    subbands
}

fn dwt_2d_step(image: &mut Vec<Vec<f32>>, size: usize) {
    let sqrt2 = 2.0_f32.sqrt();

    for y in 0..size {
        let mut row = vec![0.0; size];
        for i in 0..size / 2 {
            row[i] = (image[y][2 * i] + image[y][2 * i + 1]) / sqrt2;
            row[i + size / 2] = (image[y][2 * i] - image[y][2 * i + 1]) / sqrt2;
        }
        for x in 0..size {
            image[y][x] = row[x];
        }
    }

    for x in 0..size {
        let mut col = vec![0.0; size];
        for i in 0..size / 2 {
            col[i] = (image[2 * i][x] + image[2 * i + 1][x]) / sqrt2;
            col[i + size / 2] = (image[2 * i][x] - image[2 * i + 1][x]) / sqrt2;
        }
        for y in 0..size {
            image[y][x] = col[y];
        }
    }
}

fn extract_rect(img: &[Vec<f32>], y1: usize, x1: usize, y2: usize, x2: usize) -> Vec<Vec<f32>> {
    (y1..y2)
        .map(|y| (x1..x2).map(|x| img[y][x]).collect())
        .collect()
}

fn get_spatial_pixel(subband: &[Vec<f32>], progress: f32) -> f32 {
    let h = subband.len();
    if h == 0 {
        return 0.0;
    }
    let w = subband[0].len();
    if w == 0 {
        return 0.0;
    }
    let y = (progress * h as f32) as usize % h;
    let x = (progress * w as f32) as usize % w;
    subband[y][x]
}
