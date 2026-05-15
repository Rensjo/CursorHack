import { useState } from "react";
import StarryBackdrop from "./components/StarryBackdrop.jsx";
import UploadScreen from "./components/UploadScreen.jsx";
import LoadingState from "./components/LoadingState.jsx";
import ResultsScreen from "./components/ResultsScreen.jsx";
import { compareImages } from "./api.js";

export default function App() {
  const [view, setView] = useState("upload"); // upload | loading | results
  const [comparison, setComparison] = useState(null);
  const [images, setImages] = useState(null);
  const [error, setError] = useState(null);

  async function handleCompare(original, suspect) {
    setError(null);
    setView("loading");
    setImages({ original: original.dataURL, suspect: suspect.dataURL });

    try {
      const compResult = await compareImages(
        original.dataURL,
        suspect.dataURL,
        original.name,
        suspect.name,
      );
      setComparison(compResult);
      setView("results");
    } catch (e) {
      setError(`Comparison failed: ${e.message}`);
      setView("upload");
    }
  }

  function handleReset() {
    setView("upload");
    setComparison(null);
    setImages(null);
    setError(null);
  }

  return (
    <>
      <StarryBackdrop />
      {view === "loading" ? (
        <LoadingState />
      ) : view === "results" && comparison && images ? (
        <ResultsScreen comparison={comparison} images={images} onReset={handleReset} />
      ) : (
        <UploadScreen onCompare={handleCompare} error={error} />
      )}
    </>
  );
}
