export function FirefoxLayout() {
  return (
    <div className="flex justify-center items-center mb-8">
      <img
        src="chrome://branding/content/about-logo.png"
        alt=""
        aria-hidden="true"
        className="w-16 h-16 mr-4"
      />
      <img
        src="chrome://branding/content/firefox-wordmark.svg"
        alt="G-Browser"
        className="h-12"
      />
    </div>
  );
}
