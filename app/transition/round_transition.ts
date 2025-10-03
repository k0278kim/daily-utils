import {ValueAnimationTransition} from "motion-dom";

export const roundTransition: ValueAnimationTransition = {
  type: "spring", // 스프링 애니메이션
    stiffness: 100, // 스프링 강도 (높을수록 빠르게 복원)
    damping: 15, // 감쇠 계수 (낮을수록 많이 튕김)
    mass: 1, // 질량 (크면 더 느리게, 묵직하게 움직임)
    duration: 0.3
}