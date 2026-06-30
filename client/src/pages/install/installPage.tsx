import InstallDatabaseForm from "../../features/install-database/ui/InstallDatabaseForm";

const InstallPage = () => {
  return (
    <section className="section install-page h-100">
      <div className="container flex flex-center h-100__percent">
        <InstallDatabaseForm />
      </div>
    </section>
  );
};

export default InstallPage;