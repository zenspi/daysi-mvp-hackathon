import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register service worker for PWA (temporarily disabled for debugging)
// if ('serviceWorker' in navigator && import.meta.env.PROD) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker.register('/sw.js', { scope: '/' })
//       .then((registration) => {
//         console.log('SW registered: ', registration);
//       })
//       .catch((registrationError) => {
//         console.log('SW registration failed: ', registrationError);
//       });
//   });
// }

createRoot(document.getElementById("root")!).render(<App />);
