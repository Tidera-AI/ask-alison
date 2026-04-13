import "@/app/globals.css";

export const metadata = {
  title: "Ask Alison — Etiquette Assistant",
};

export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white dark:bg-zinc-950">
        {children}
      </body>
    </html>
  );
}
