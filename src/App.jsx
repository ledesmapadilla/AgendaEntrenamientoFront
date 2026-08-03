import { BrowserRouter, Routes, Route } from "react-router-dom";
import Entrenamientos from "./components/pages/Entrenamientos";
import Error404 from "./components/pages/Error404";

function App() {
  return (
    <BrowserRouter>
      <main>
        <Routes>
          <Route path="/" element={<Entrenamientos />} />
          <Route path="/entrenamientos" element={<Entrenamientos />} />
          <Route path="/visitas" element={<Entrenamientos />} />
          <Route path="*" element={<Error404 />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
