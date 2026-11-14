import groupMask from "@/assets/logo/group-mask.svg";
import group from "@/assets/logo/group.svg";
import v0 from "@/assets/logo/v0.svg";
import v1 from "@/assets/logo/v1.svg";
import v2 from "@/assets/logo/v2.svg";
import v3 from "@/assets/logo/v3.svg";
import v4 from "@/assets/logo/v4.svg";
import v5 from "@/assets/logo/v5.svg";
import v6 from "@/assets/logo/v6.svg";
import v7 from "@/assets/logo/v7.svg";
import v8 from "@/assets/logo/v8.svg";
import v9 from "@/assets/logo/v9.svg";
import v10 from "@/assets/logo/v10.svg";

// Wordmark layers, positioned exactly as in the Figma "Logo Container 1" (109 × 25).
const layers: [string, string][] = [
  [v0, "12.72% 67.08% 18.55% 27.17%"],
  [v1, "12.72% 67.08% 18.55% 27.17%"],
  [v2, "15.57% 62.7% 18.55% 34.98%"],
  [v3, "15.57% 62.7% 18.55% 34.98%"],
  [v4, "31.59% 48.95% 17.75% 39.6%"],
  [v5, "31.59% 48.95% 17.75% 39.6%"],
  [v6, "32.39% 31.57% 18.55% 52.03%"],
  [v7, "32.39% 31.57% 18.55% 52.03%"],
  [v8, "20.2% 24.39% 18.55% 69.21%"],
  [v9, "31.59% 11.49% 17.75% 76.98%"],
  [v10, "32.39% 0 18.55% 90.24%"],
];

export function Logo() {
  return (
    <div className="relative h-[25px] w-[109px] shrink-0 overflow-hidden" role="img" aria-label="flowtax">
      <div
        className="absolute"
        style={{
          inset: "-12.78% 76.2% 5.04% -5.02%",
          maskImage: `url("${groupMask}")`,
          WebkitMaskImage: `url("${groupMask}")`,
          maskSize: "23.695px 23.741px",
          WebkitMaskSize: "23.695px 23.741px",
          maskPosition: "5.47px 3.196px",
          WebkitMaskPosition: "5.47px 3.196px",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
        }}
      >
        <div className="absolute" style={{ inset: "-0.69% -1.51% 0 0" }}>
          <img alt="" src={group} className="block size-full max-w-none" />
        </div>
      </div>
      {layers.map(([src, inset], i) => (
        <div key={i} className="absolute" style={{ inset }}>
          <img alt="" src={src} className="absolute inset-0 block size-full max-w-none" />
        </div>
      ))}
    </div>
  );
}
