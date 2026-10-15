import { Outlet } from "react-router-dom";
import "./InstallLayout.css";

const installLayout = () => {
  return (
    <div className="install-layout">
      <iframe
        className="install-layout__background"
        src={`${import.meta.env.BASE_URL}animations/install-particles/index.html`}
        title=""
        aria-hidden="true"
        tabIndex={-1}
        sandbox="allow-scripts allow-same-origin"
      />
      <div className="install-layout__content">
        <Outlet />
      </div>
    </div>
  );
};

export default installLayout;
