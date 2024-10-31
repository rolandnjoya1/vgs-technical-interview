//Initalize client  
const instance = axios.create({
  //insert your Vault ID which can be found under "Vault" in your VGS Vault Dashboard
  baseURL: `https://${VGS_VAULT_ID}.sandbox.verygoodproxy.com`,
  headers: {
      'Content-Type': 'application/json',
  },
});

// Create Axios instance
const api = axios.create({
  baseURL: API_GW_ENDPOINT,
  headers: {
    'Content-Type': 'application/json',
    },
  timeout: 10000
});


// Method to send card information POST to VGS
async function getData() {

  try {

      const cardNumber = document.getElementById('cardNumber').value;
      const cardHolder = document.getElementById('cardHolder').value;
      const expires = document.getElementById('expires').value;
      const cvc = document.getElementById('cvc').value;

      const response = await instance.post('/post', {
          card_holder: cardHolder,
          card_number: cardNumber,
          expiry_date: expires,
          card_cvc: cvc
      });
      console.log('Post request via VGS proxy succeeded. \n Response data:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error caught during request:', error.message);
      throw error;
  }
}

async function sendDataToApiGateway(aliasdata) {
  try {
    const response = await api.post('', data);
    console.log('Response from API Gateway:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending data to API Gateway:', error.message);
    throw error;
  }
}


//Method to send Tokenized data to our backend
const inboundDataRequest = async () => {

  console.log("button clicked");

  try {
    const inboundRouteAlias = await getData();
    console.log('VGS Inbound Route Alias', inboundRouteAlias);
    // post to dynamodb table
    data = {
        "card-security-code": inboundRouteAlias.card_cvc,
        "card_holder": inboundRouteAlias.card_holder,
        "card-number": inboundRouteAlias.card_number,
        "card-expiration-date": inboundRouteAlias.card_number
    }
    sendDataToApiGateway(data).then(response => {
    window.location.href = "paysuccess.html";  
    console.log('Successfully sent data:', response);
    })
    .catch(error => {
      window.location.href = "payfailure.html";  
      console.error('Failed to send data:', error);
    });

  } catch (error) {
    console.log("Failed to process request", error);
    
  }
   
};

document.getElementById('checkout-btn').addEventListener('click',inboundDataRequest)



    

