const algosdk = require("algosdk");
const {mnemonicToSecretKey} = require("algosdk");
const crypto = require('crypto');
const fs = require('fs').promises;

const algodClient = new algosdk.Algodv2(
  process.env.ALGOD_TOKEN,
  process.env.ALGOD_SERVER,
  process.env.ALGOD_PORT
);

const submitToNetwork = async (signedTxn) => {
  // send txn
  let tx = await algodClient.sendRawTransaction(signedTxn).do();
  console.log("Transaction : " + tx.txId);

  // Wait for transaction to be confirmed
  confirmedTxn = await algosdk.waitForConfirmation(algodClient, tx.txId, 4);

  //Get the completed Transaction
  console.log(
    "Transaction " +
      tx.txId +
      " confirmed in round " +
      confirmedTxn["confirmed-round"]
  );

  return confirmedTxn;
};

// Get image integrity to put in metadata.json.
const getImageIntegrity = async () => {
  const fullPathImage = __dirname + '/img/smile.png';
  const metadatafileImage = (await fs.readFile(fullPathImage));
  const hashImage = crypto.createHash('sha256');
  hashImage.update(metadatafileImage);
  const hashImageBase64 = hashImage.digest("base64");
  const imageIntegrity = "sha256-" + hashImageBase64;

  console.log("image_integrity : " + imageIntegrity);

  return imageIntegrity;
};

(async () => {
  // Write your code here
  const NFTprice = 1000000;
  let params = await algodClient.getTransactionParams().do();
  // Get image integrity to put in metadata.json.
  await getImageIntegrity();

  // Creator Account
  let creatorAccount = mnemonicToSecretKey(process.env.CREATOR_MNEMONIC);
  console.log("Creator account address: %s", creatorAccount.addr);

  // Artist Account
  let artistAccount = mnemonicToSecretKey(process.env.ARTIST_MNEMONIC);
  console.log("Artist account address: %s", artistAccount.addr);

  // Buyer Account
  let buyerAccount = mnemonicToSecretKey(process.env.BUYER_MNEMONIC);
  console.log("Buyer account address: %s", buyerAccount.addr);

  console.log('Creating NFT');
  // Setup create NFT parameters
  const defaultFrozen = false;
  const unitName = "ALDIART";
  const assetName = "Aldi's Smile Artwork@arc1";
  const url = "img/metadata.json";
  const managerAddr = undefined;
  const reserveAddr = undefined;
  const freezeAddr = undefined;
  const clawbackAddr = undefined;
  const total = 1;                // NFTs have totalIssuance of exactly 1
  const decimals = 0;             // NFTs have decimals of exactly 0

  // Get NFT Metadata
  const fullPath = __dirname + '/img/metadata.json';
  const metadatafile = (await fs.readFile(fullPath));
  const hash = crypto.createHash('sha256');
  hash.update(metadatafile);

  const metadata = new Uint8Array(hash.digest());

  // Create NFT Transaction
  let txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
    from: creatorAccount.addr,
    total,
    decimals,
    assetName,
    unitName,
    assetURL: url,
    assetMetadataHash: metadata,
    defaultFrozen,
    freeze: freezeAddr,
    manager: managerAddr,
    clawback: clawbackAddr,
    reserve: reserveAddr,
    suggestedParams: params,
  });

  // Sign create NFT Transaction and submit to network
  let rawSignedTxn = txn.signTxn(creatorAccount.sk);
  let confirmedTxn = await submitToNetwork(rawSignedTxn);

  let NFTAssetIndex = confirmedTxn["asset-index"];
  console.log('NFT Asset ID:', NFTAssetIndex);

  console.log('Sending NFT payment from Buyer Account to Creator Account.');

  // Buyer transfer payment to buy NFT to Creator
  let transactionOptions = {
    from: buyerAccount.addr,
    to: creatorAccount.addr,
    amount: NFTprice,
    suggestedParams: params,
  };

  txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject(transactionOptions);

  rawSignedTxn = txn.signTxn(buyerAccount.sk);
  await submitToNetwork(rawSignedTxn);

  console.log('Sending NFT from creator account to buyer account.');

  // Buyer transfer payment to buy NFT to Creator
  transactionOptions = {
    from: creatorAccount.addr,
    to: buyerAccount.addr,
    amount: 1,
    assetIndex: NFTAssetIndex,
    suggestedParams: params,
  };

  txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject(transactionOptions);

  rawSignedTxn = txn.signTxn(creatorAccount.sk);
  await submitToNetwork(rawSignedTxn);

  console.log('Sending Fee from Creator Account to Artist Account.');

  // Buyer transfer payment to buy NFT to Creator
  transactionOptions = {
    from: creatorAccount.addr,
    to: artistAccount.addr,
    amount: NFTprice * 0.1,
    suggestedParams: params,
  };

  txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject(transactionOptions);

  rawSignedTxn = txn.signTxn(creatorAccount.sk);
  await submitToNetwork(rawSignedTxn);
})();
