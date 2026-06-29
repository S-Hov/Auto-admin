import InstallDatabaseForm from "../../features/install-database/ui/InstallDatabaseForm";

const InstallPage = () => {
  return (
    <section className="section install-page mh-100">
      <div className="container flex flex-center">
        <InstallDatabaseForm />
      </div>
    </section>
  );
};

export default InstallPage;