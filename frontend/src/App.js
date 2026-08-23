import "@/App.css";
import BustALead from "@/BustALead";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <BustALead />
    </ErrorBoundary>
  );
}

export default App;
