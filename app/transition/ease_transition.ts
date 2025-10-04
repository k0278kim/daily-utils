import {Transition, ValueAnimationTransition} from "motion-dom";

export const easeInOutTranstion: Transition = {
  ease: "easeOut", // 또는 "linear", "ease-in", "ease-out", [0.42, 0, 0.58, 1] 같은 cubic-bezier 가능
  duration: 0.3       // 지속 시간 (초 단위)
};