import RunMigrationsForm from "../../features/run-migrations/ui/runMigrationsForm";

const RunMigrationsPage = () => {
    return (
        <section className="section run-migrations-page h-100">
            <div className="container flex flex-center h-100__percent">
                <RunMigrationsForm />
            </div>
        </section>
    );
}

export default RunMigrationsPage;