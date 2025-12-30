let googleMapsScriptPromise: Promise<void> | null = null;

export const loadGoogleMapsScript = (apiKey: string) => {
  const w = window as any;
  if (w.google?.maps?.places) {
    return Promise.resolve();
  }
  if (googleMapsScriptPromise) {
    return googleMapsScriptPromise;
  }
  googleMapsScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("google-maps-load-failed"));
    document.head.appendChild(script);
  });
  return googleMapsScriptPromise;
};
