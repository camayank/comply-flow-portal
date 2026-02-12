import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { setupFetchCsrf } from './lib/csrf'

setupFetchCsrf();

createRoot(document.getElementById("root")!).render(<App />);
