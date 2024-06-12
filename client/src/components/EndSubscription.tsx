import { useState } from "react";

interface CancelProps {
    subscriptionId: string;
  }

export const EndSubscription: React.FC<CancelProps>  = ({ subscriptionId }) => {
   const [error, setError] = useState('');
   
    //hämta användaren
    //hämta sublevel och endDate'
    //På enddate ska subscription deleteas
    //gå in på stripe och ta bort nästa betalning
  console.log(subscriptionId);

    const handleClick = async() => {   

    try {
      const response = await fetch('http://localhost:3000/api/payments/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ subscriptionId })
      });

      const data = await response.json();
      if (response.ok) {
        // window.location.href = data;
      } else {
        setError('Failed to get payment link: ' + data.error);
      }
    } catch (error) {
      setError('Error: ' + error);
    } finally {
    }
    }
    
    return (
        <div>
            <button onClick={handleClick}>Cancel subscription</button>
            {error && <p style={{ color: 'red' }}>{error}</p>}

        </div>
    )

}