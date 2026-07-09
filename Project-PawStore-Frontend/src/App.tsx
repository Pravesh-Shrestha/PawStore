import { Outlet } from "react-router-dom";
import NavBar from "./component/Main/Header/NavBar";
import { useEffect } from "react";
import configData from "./utils/config.json";
import "./App.css";
import Footer from "./component/Main/Footer/Footer";
import { Toaster } from "react-hot-toast";

function App(): React.ReactElement {
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--primary-bg",
      configData.PRIMARY_BG,
    );
  }, []);
  return (
    <>
      <NavBar />
      {/* Spacer for fixed navbar */}
      <div className="h-16 lg:h-20" />
      <main className="font-fredoka min-h-screen">
        <Outlet />
      </main>
      <Footer />
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: "12px",
            background: "#333",
            color: "#fff",
            fontSize: "14px",
          },
        }}
      />
    </>
  );
}

export default App;
