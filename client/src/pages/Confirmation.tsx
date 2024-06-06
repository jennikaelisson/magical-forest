import { useEffect, useState } from "react";

export const Confirmation = () => {
    const [verified, setVerified] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!verified) {
            console.log("CoduCruisers nu körs jag!");
            const verifySession = async () => {
                console.log("CodeCruisers och jag går in i funktionen");
                let sessionId;
                const dataFromLS = localStorage.getItem("sessionId");
                console.log(dataFromLS);
                

                if (dataFromLS) {
                    sessionId = JSON.parse(dataFromLS);
                    console.log(sessionId)
                }
                
                const response = await fetch("http://localhost:3000/api/payments/verify-session", {
                method: "POST",    
                headers: {
                    "Content-type": "application/json"
                },
                body: JSON.stringify({ sessionId })
                })
                console.log(response);
                
                const data = await response.json();
                console.log(data);
                

                if (response.ok) {
                    setVerified(data.verified)
                    setIsLoading(false)
                }
            }
            verifySession()
        }
    }, [verified])


    return <>
    {verified && !isLoading ? "Tack för ditt köp" : "Laddar..."}</>
}