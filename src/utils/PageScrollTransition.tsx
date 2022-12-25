import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { usePrevious } from "./usePrevValue";

const DEFAULT_COMPONENT_INDEX = 0;
const DEFAULT_COMPONENTS_TO_RENDER_LENGTH = 0;

const KEY_UP = 38;
const KEY_DOWN = 40;
const MINIMAL_DELTA_Y_DIFFERENCE = 1;

let previousTouchMove = 0;
let isScrolling = false;
let isTransitionAfterComponentsToRenderChanged = false;
const isNil = (value: any) => value === undefined || value === null;
const isNull = (value: any) => value === null;

interface Props {
  animationTimer?: number;
  animationTimerBuffer?: number;
  children: JSX.Element[];
  containerHeight?: number | string;
  containerWidth?: number | string;
  customPageNumber: number;
  pageOnChange: (number: number) => void;
}

export const PageScrollTransition = ({
  animationTimer = 1000,
  animationTimerBuffer = 200,
  children,
  containerHeight = "100vh",
  containerWidth = "100vw",
  customPageNumber,
  pageOnChange,
}: Props) => {
  const [componentIndex, setComponentIndex] = useState(DEFAULT_COMPONENT_INDEX);
  const [componentsToRenderLength, setComponentsToRenderLength] = useState(
    DEFAULT_COMPONENTS_TO_RENDER_LENGTH
  );
  const prevComponentIndex = usePrevious(componentIndex);
  const scrollContainer = useRef<HTMLDivElement>(null);
  const pageContainer = useRef<HTMLDivElement>(null);
  const lastScrolledElement = useRef(null);
  const isMountedRef = useRef(false);
  const containersRef = useRef<boolean[]>([]);

  const positions = useMemo(
    () =>
      children.reduce(
        (_positions, _children) => {
          const lastElement: number[] = _positions.slice(-1);
          const height = _children.props.height
            ? parseInt(_children.props.height, 10)
            : 100;
          return _positions.concat([lastElement[0] - height]);
        },
        [0]
      ),
    [children]
  );

  const scrollPage = useCallback(
    (nextComponentIndex: number) => {
      if (!pageContainer.current) {
        return;
      }
      pageContainer.current.style.transform = `translate3d(0, ${positions[nextComponentIndex]}%, 0)`;
    },
    [positions]
  );

  const addNextComponent = useCallback(
    (componentsToRenderOnMountLength = 0) => {
      let tempComponentsToRenderLength = Math.max(
        componentsToRenderOnMountLength,
        componentsToRenderLength
      );

      if (tempComponentsToRenderLength <= componentIndex + 1) {
        if (!isNil(children[componentIndex + 1])) {
          tempComponentsToRenderLength++;
        }
      }

      setComponentsToRenderLength(tempComponentsToRenderLength);
    },
    [children, componentIndex, componentsToRenderLength]
  );

  const checkRenderOnMount = useCallback(() => {
    if (!isNil(children[DEFAULT_COMPONENT_INDEX + 1])) {
      const componentsToRenderAdditionally = positions.filter(
        (position) => Math.abs(position) < 200
      ).length;

      addNextComponent(
        DEFAULT_COMPONENTS_TO_RENDER_LENGTH + componentsToRenderAdditionally
      );
    }
  }, [addNextComponent, children, positions]);

  const setRenderComponents = useCallback(() => {
    if (!containersRef.current) {
      return null;
    }
    const newComponentsToRender = [];

    let i = 0;

    while (i < componentsToRenderLength && !isNil(children[i])) {
      containersRef.current[i] = true;
      newComponentsToRender.push(
        <React.Fragment key={i}>{children[i]}</React.Fragment>
      );
      i++;
    }

    return newComponentsToRender;
  }, [children, componentsToRenderLength]);

  const scrollWindowDown = useCallback(() => {
    if (!isScrolling) {
      if (!isNil(containersRef.current[componentIndex + 1])) {
        isScrolling = true;
        scrollPage(componentIndex + 1);

        setTimeout(() => {
          if (isMountedRef.current) {
            setComponentIndex((prevState) => prevState + 1);
          }
        }, animationTimer + animationTimerBuffer);
      }
    }
  }, [animationTimer, animationTimerBuffer, componentIndex, scrollPage]);

  const scrollWindowUp = useCallback(() => {
    if (!isScrolling) {
      if (!isNil(containersRef.current[componentIndex - 1])) {
        isScrolling = true;
        scrollPage(componentIndex - 1);

        setTimeout(() => {
          if (isMountedRef.current) {
            setComponentIndex((prevState) => prevState - 1);
          }
        }, animationTimer + animationTimerBuffer);
      }
    }
  }, [animationTimer, animationTimerBuffer, componentIndex, scrollPage]);

  const touchMove = useCallback(
    (event: any) => {
      if (!isNull(previousTouchMove)) {
        if (event.touches[0].clientY > previousTouchMove) {
          scrollWindowUp();
        } else {
          scrollWindowDown();
        }
      } else {
        previousTouchMove = event.touches[0].clientY;
      }
    },
    [scrollWindowDown, scrollWindowUp]
  );

  const wheelScroll = useCallback(
    (event: any) => {
      if (Math.abs(event.deltaY) > MINIMAL_DELTA_Y_DIFFERENCE) {
        if (event.deltaY > 0) {
          lastScrolledElement.current = event.target;
          scrollWindowDown();
        } else {
          lastScrolledElement.current = event.target;
          scrollWindowUp();
        }
      }
    },
    [scrollWindowDown, scrollWindowUp]
  );

  const keyPress = useCallback(
    (event: any) => {
      if (event.keyCode === KEY_UP) {
        scrollWindowUp();
      }
      if (event.keyCode === KEY_DOWN) {
        scrollWindowDown();
      }
    },
    [scrollWindowDown, scrollWindowUp]
  );

  useEffect(() => {
    const instance = scrollContainer.current as HTMLDivElement;
    instance.addEventListener("touchmove", touchMove, { passive: true });
    instance.addEventListener("keydown", keyPress);
    return () => {
      instance.removeEventListener("touchmove", touchMove);
      instance.removeEventListener("keydown", keyPress);
    };
  }, [keyPress, touchMove]);

  useEffect(() => {
    isMountedRef.current = true;

    checkRenderOnMount();
    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    isScrolling = false;
    previousTouchMove = 0;
    if (componentIndex > prevComponentIndex) {
      addNextComponent();
    }
  }, [addNextComponent, componentIndex, prevComponentIndex]);

  useEffect(() => {
    if (pageOnChange) {
      pageOnChange(componentIndex);
    }
  }, [pageOnChange, componentIndex]);

  useEffect(() => {
    if (!isNil(customPageNumber) && customPageNumber !== componentIndex) {
      let newComponentsToRenderLength = componentsToRenderLength;

      if (customPageNumber !== componentIndex) {
        if (!isNil(containersRef.current[customPageNumber]) && !isScrolling) {
          isScrolling = true;
          scrollPage(customPageNumber);

          if (
            isNil(containersRef.current[customPageNumber]) &&
            !isNil(children[customPageNumber])
          ) {
            newComponentsToRenderLength++;
          }

          setTimeout(() => {
            setComponentIndex(customPageNumber);
            setComponentsToRenderLength(newComponentsToRenderLength);
          }, animationTimer + animationTimerBuffer);
        } else if (!isScrolling && !isNil(children[customPageNumber])) {
          for (let i = componentsToRenderLength; i <= customPageNumber; i++) {
            newComponentsToRenderLength++;
          }

          if (!isNil(children[customPageNumber])) {
            newComponentsToRenderLength++;
          }

          isScrolling = true;
          isTransitionAfterComponentsToRenderChanged = true;
          setComponentsToRenderLength(newComponentsToRenderLength);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customPageNumber, scrollPage]);

  useEffect(() => {
    if (isTransitionAfterComponentsToRenderChanged) {
      isTransitionAfterComponentsToRenderChanged = false;

      scrollPage(customPageNumber);

      setTimeout(() => {
        setComponentIndex(customPageNumber);
      }, animationTimer + animationTimerBuffer);
    }
  }, [
    animationTimer,
    animationTimerBuffer,
    componentsToRenderLength,
    customPageNumber,
    scrollPage,
  ]);

  return (
    <div
      ref={scrollContainer}
      style={{
        height: containerHeight,
        width: containerWidth,
        overflow: "hidden",
      }}
    >
      <div
        ref={pageContainer}
        style={{
          height: "100%",
          width: "100%",
          transition: `transform ${animationTimer}ms ease-in-out`,
          outline: "none",
        }}
        tabIndex={customPageNumber}
        onWheel={wheelScroll}
      >
        {setRenderComponents()}
      </div>
    </div>
  );
};
