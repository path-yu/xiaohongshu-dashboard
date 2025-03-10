import { type ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import FadeTransition from "./fade-transition";
import SlideTransition from "./slide-transition";

interface PageTransitionRouterProps {
  children: ReactNode;
}

// Define transition types for different routes
const routeTransitions: Record<
  string,
  {
    component: typeof FadeTransition | typeof SlideTransition;
    props?: any;
  }
> = {
  "/": {
    component: FadeTransition,
  },
  "/search": {
    component: SlideTransition,
    props: { direction: "right" },
  },
  "/templates": {
    component: SlideTransition,
    props: { direction: "up" },
  },
  "/settings": {
    component: SlideTransition,
    props: { direction: "left" },
  },
  "/auto-action": {
    component: SlideTransition,
    props: { direction: "down" },
  },
};

export default function PageTransitionRouter({
  children,
}: PageTransitionRouterProps) {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState("fadeIn");

  useEffect(() => {
    if (location !== displayLocation) {
      setTransitionStage("fadeOut");
    }
  }, [location, displayLocation]);

  const handleAnimationEnd = () => {
    if (transitionStage === "fadeOut") {
      setTransitionStage("fadeIn");
      setDisplayLocation(location);
    }
  };

  // Get the appropriate transition for the current route
  const { component: TransitionComponent, props = {} } = routeTransitions[
    location.pathname
  ] || {
    component: FadeTransition,
  };

  return (
    <div
      className={`transition-container ${transitionStage}`}
      onAnimationEnd={handleAnimationEnd}
    >
      <TransitionComponent {...props}>{children}</TransitionComponent>
    </div>
  );
}
