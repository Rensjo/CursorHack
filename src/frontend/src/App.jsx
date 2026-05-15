import { useState } from "react";
import UploadScreen from "./components/UploadScreen.jsx";
import LoadingState from "./components/LoadingState.jsx";
import ResultsScreen from "./components/ResultsScreen.jsx";
import { compareImages, describeChanges } from "./api.js";

export default function App() {
  const [view, setView] = useState("upload"); // upload | loading | results
  const [comparison, setComparison] = useState(null);
  const [description, setDescription] = useState("");
  const [descriptionLoading, setDescriptionLoading] = useState(false);
  const [descriptionError, setDescriptionError] = useState(null);
  const [images, setImages] = useState(null);
  const [error, setError] = useState(null);

  async function handleCompare(original, suspect) {
    setError(null);
    setView("loading");
    setImages({ original: original.dataURL, suspect: suspect.dataURL });

    try {
      // Run comparison first — that produces the heatmap we show immediately
      const compResult = await compareImages(original.dataURL, suspect.dataURL);
      setComparison(compResult);
      setView("results");

      // Then kick off the AI description in parallel (don't block the UI on this)
      setDescriptionLoading(true);
      setDescriptionError(null);
      describeChanges(original.dataURL, suspect.dataURL)
        .then((res) => setDescription(res.description))
        .catch((e) => setDescriptionError(`AI analysis unavailable: ${e.message}`))
        .finally(() => setDescriptionLoading(false));
    } catch (e) {
      setError(`Comparison failed: ${e.message}`);
      setView("upload");
    }
  }

  function handleReset() {
    setView("upload");
    setComparison(null);
    setDescription("");
    setDescriptionError(null);
    setImages(null);
    setError(null);
  }

  if (view === "loading") return <LoadingState />;

  if (view === "results" && comparison && images) {
    return (
      <ResultsScreen
        comparison={comparison}
        description={description}
        descriptionLoading={descriptionLoading}
        descriptionError={descriptionError}
        images={images}
        onReset={handleReset}
      />
    );
  }

  return <UploadScreen onCompare={handleCompare} error={error} />;
}
