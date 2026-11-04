import { useParams } from "react-router-dom";

const DataPage = () => {
    const {dataPageId} = useParams<{ dataPageId: string }>();
    
    return (
        <div>Data Page: {dataPageId}</div>
    )
}

export default DataPage;