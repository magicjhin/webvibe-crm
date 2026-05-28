export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4 py-12">
      {children}
    </div>
  );
}
