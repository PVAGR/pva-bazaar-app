const https = require('https');

function testAPI() {
    const req = https.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd', (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            try {
                const prices = JSON.parse(data);
                console.log('Live Crypto Prices:');
                console.log('BTC:', prices.bitcoin.usd);
                console.log('ETH:', prices.ethereum.usd);

                // Test artifact calculation
                const usdPrice = 1200; // Maradjet Emerald Pendant price
                const ethEquivalent = (usdPrice / prices.ethereum.usd).toFixed(4);
                const btcEquivalent = (usdPrice / prices.bitcoin.usd).toFixed(6);

                console.log('\nFor $1200 USD artifact:');
                console.log('ETH equivalent:', ethEquivalent);
                console.log('BTC equivalent:', btcEquivalent);

            } catch (error) {
                console.error('Error parsing crypto data:', error);
            }
        });
    });

    req.on('error', (error) => {
        console.error('Error fetching crypto prices:', error);
    });

    req.setTimeout(5000, () => {
        req.destroy();
        console.log('Request timed out');
    });
}

testAPI();
