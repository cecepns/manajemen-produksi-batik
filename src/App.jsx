import { ToastContainer } from 'react-toastify';
import { AppRouter } from './router/AppRouter';
import 'react-toastify/dist/ReactToastify.css';

export default function App() {
  return (
    <>
      <AppRouter />
      <ToastContainer
        position="top-right"
        autoClose={4000}
        newestOnTop
        pauseOnFocusLoss={false}
        theme="light"
        toastClassName="rounded-xl shadow-lg border border-slate-200/80"
        bodyClassName="text-base text-slate-800"
      />
    </>
  );
}
