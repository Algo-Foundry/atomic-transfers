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
3. Add account information (address and mnemonic) into the `.env` file.
4. Use variables from `.env` file by running `source .env`.

### Get account mnemonic
To get the mnemonic of an account in goal CLI, replace the `<account address>` run this command in your sandbox directory.
```
./sandbox goal account export -a <account address>
```

### Running your script
Run your script with `node atomic.js`.

### Key points to remember
If any one transaction in an atomic transfer fails, all transactions within the atomic transfer will not happen.