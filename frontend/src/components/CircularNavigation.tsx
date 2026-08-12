import { useMemo } from "react";
import "./CircularNavigation.css";

export type NavigationItem =
  | "queue"
  | "history"
  | "camera";

interface CircularNavigationProps {
  activeItem: NavigationItem;
  onNavigate: (item: NavigationItem) => void;
  onCameraCapture: () => void;
}

interface NavConfig {
  id: NavigationItem;
  label: string;
  icon: string;
}

/*
 * =========================================================
 * NAVIGATION ORDER
 * =========================================================
 *
 * Circular relationship:
 *
 * queue -> camera -> history -> queue
 *
 * Camera active:
 *
 *      Queue | Camera | History
 *
 * History active:
 *
 *      Camera | History | Queue
 *
 * Queue active:
 *
 *      History | Queue | Camera
 */

const NAV_ITEMS: NavConfig[] = [
  {
    id: "queue",
    label: "Queue",
    icon: "sync",
  },
  {
    id: "camera",
    label: "Camera",
    icon: "photo_camera",
  },
  {
    id: "history",
    label: "History",
    icon: "history",
  },
];

export default function CircularNavigation({
  activeItem,
  onNavigate,
  onCameraCapture,
}: CircularNavigationProps) {

  /*
   * =======================================================
   * CALCULATE CIRCULAR POSITIONS
   * =======================================================
   *
   * 0 = center
   * 1 = right
   * 2 = left
   */

  const positions = useMemo(() => {
    const activeIndex = NAV_ITEMS.findIndex(
      (item) => item.id === activeItem
    );

    return NAV_ITEMS.map((item, index) => {
      const relativePosition =
        (index -
          activeIndex +
          NAV_ITEMS.length) %
        NAV_ITEMS.length;

      if (relativePosition === 0) {
        return {
          ...item,
          position: "center" as const,
        };
      }

      if (relativePosition === 1) {
        return {
          ...item,
          position: "right" as const,
        };
      }

      return {
        ...item,
        position: "left" as const,
      };
    });
  }, [activeItem]);


  /*
   * =======================================================
   * RENDER
   * =======================================================
   */

  return (
    <nav
      className="circular-navigation"
      aria-label="Main navigation"
    >
      <div className="circular-navigation-track">

        {positions.map((item) => {
          const isActive =
            item.id === activeItem;

          return (
            <button
              key={item.id}
              type="button"
              className={[
                "circular-nav-item",
                `circular-nav-item--${item.position}`,
                isActive
                  ? "circular-nav-item--active"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}

              /*
               * =================================================
               * CLICK BEHAVIOUR
               * =================================================
               *
               * If Camera is already active:
               *
               *     Click Camera
               *          ↓
               *     onCameraCapture()
               *          ↓
               *     CameraScreen.capture()
               *
               * Otherwise:
               *
               *     Queue / History / Camera
               *          ↓
               *     change active navigation
               */

              onClick={() => {
                if (
                  item.id === "camera" &&
                  activeItem === "camera"
                ) {
                  onCameraCapture();
                } else {
                  onNavigate(item.id);
                }
              }}

              aria-current={
                isActive
                  ? "page"
                  : undefined
              }

              aria-label={
                item.id === "camera" &&
                activeItem === "camera"
                  ? "Capture document"
                  : `Go to ${item.label}`
              }
            >

              <span className="circular-nav-icon material-symbols-outlined">
                {item.icon}
              </span>

              <span className="circular-nav-label">
                {item.label}
              </span>

            </button>
          );
        })}

      </div>
    </nav>
  );
}