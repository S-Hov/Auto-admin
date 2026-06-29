import { Outlet } from "react-router-dom";

const installLayout = () => {
  return (
    <div className="install-layout">
      <Outlet />
    </div>
  );
};

export default installLayout;