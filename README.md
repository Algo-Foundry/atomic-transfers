## Atomic transfers assignment

Create an asset (NFT or fungible token). After which, create an atomic transfer that consists of the following transactions,

1. Buyer account pays 1 Algo to the creator.
2. Buyer opts into the asset. 
3. Creator sends the NFT to the buyer.
4. Creator sends 10% of the payment to the artist's account.
 
You can assume that the buyer and artist accounts are standalone accounts.

### Setup instructions
1. Install packages with `npm install`.
2. Copy `.env.example` to `.env`.
3. Update Algorand Sandbox credentials in `.env` file.
4. Use variables from `.env` file by running `source .env`.

### Running your script
2. Run your script with `node atomic.js`.

### Key points to remember
1. If any one transaction in an atomic transfer fails, all transactions within the atomic transfer will not happen.