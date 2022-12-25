import React, { useState } from "react";
import { FirstComp } from "./components/FirstComp";
import { SecondComp } from "./components/SecondComp";
import { ThirdComp } from "./components/ThirdComp";
import { FourthComp } from "./components/FourthComp";
import { PageScrollTransition } from "./utils/PageScrollTransition";

const SCROLL_ANIMATION_DURATION = 1000;

function App() {
  const [currentPage, setCurrentPage] = useState(0);
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const render = () => {
    const comps = [
      <FirstComp />,
      <SecondComp />,
      <ThirdComp />,
      <FourthComp />,
    ];

    return comps.map((comp, i) => (
      <div key={i} style={{ height: "100vh", overflow: "hidden" }}>
        {comp}
      </div>
    ));
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        margin: "0",
        overflow: "hidden",
      }}
    >
      <PageScrollTransition
        animationTimer={SCROLL_ANIMATION_DURATION}
        customPageNumber={currentPage}
        pageOnChange={handlePageChange}
      >
        {render()}
      </PageScrollTransition>
    </div>
  );
}

export default App;
