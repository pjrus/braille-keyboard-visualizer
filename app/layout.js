import "./globals.css";

export const metadata = {
  title: "Braille Keyboard Visualiser",
  description: "Explore configurable braille keyboard layouts in 3D.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-AU">
      <body>{children}</body>
    </html>
  );
}
