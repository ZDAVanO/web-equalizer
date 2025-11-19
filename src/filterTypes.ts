export const filterTypes: BiquadFilterType[] = [
  "lowpass",
  "highpass",
  "bandpass",
  "lowshelf",
  "highshelf",
  "peaking",
  "notch",
  "allpass",
];

export const filterTypeShort: Record<BiquadFilterType, string> = {
  lowpass: "LP",
  highpass: "HP",
  bandpass: "BP",
  lowshelf: "LS",
  highshelf: "HS",
  peaking: "PK",
  notch: "NT",
  allpass: "AP",
};
