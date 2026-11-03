import Providers from "../providers";

export default function BackendLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Providers>{children}</Providers>
    </div>
  );
}