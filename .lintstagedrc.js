module.exports = {
  "*.{js,ts,tsx}": ["biome check --write"],
  "*.json": [
    (filenames) => {
      // Exclude .readability directory files
      const filtered = filenames.filter(
        (f) => !f.includes("/.readability/") && !f.includes("\\.readability\\"),
      );
      return filtered.length > 0 ? [`biome format --write ${filtered.join(" ")}`] : [];
    },
  ],
};
