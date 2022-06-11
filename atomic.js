const algosdk = require("algosdk");

const algodClient = new algosdk.Algodv2(
  process.env.ALGOD_TOKEN,
  process.env.ALGOD_SERVER,
  process.env.ALGOD_PORT
);

const creator = algosdk.mnemonicToSecretKey(process.env.MNEMONIC_CREATOR);

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

const createAsset = async (maker) => {
  const total = 1; // how many of this asset there will be
  const decimals = 0; // units of this asset are whole-integer amounts
  const assetName = "nftASA";
  const unitName = "nft";
  const url = "ipfs://cid";
  const metadata = undefined;
  const defaultFrozen = false; // whether accounts should be frozen by default

  // create suggested parameters
  const suggestedParams = await algodClient.getTransactionParams().do();

  // create the asset creation transaction
  const txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
    from: maker.addr,
    total,
    decimals,
    assetName,
    unitName,
    assetURL: url,
    assetMetadataHash: metadata,
    defaultFrozen,
    freeze: undefined,
    manager: undefined,
    clawback: undefined,
    reserve: undefined,

    suggestedParams,
  });

  // sign the transaction
  const signedTxn = txn.signTxn(maker.sk);

  return await submitToNetwork(signedTxn);
};

const sendAlgos = async (sender, receiver, amount) => {
  // create suggested parameters
  const suggestedParams = await algodClient.getTransactionParams().do();

  let txn = algosdk.makePaymentTxnWithSuggestedParams(
    sender.addr,
    receiver.addr,
    amount,
    undefined,
    undefined,
    suggestedParams
  );

  // sign the transaction
  const signedTxn = txn.signTxn(sender.sk);

  const confirmedTxn = await submitToNetwork(signedTxn);
};

(async () => {
  // Accounts
  const creator = algosdk.mnemonicToSecretKey(process.env.MNEMONIC_CREATOR);
  const buyer = algosdk.generateAccount();
  const artist = algosdk.generateAccount();

  // Fund accounts (for min balance, purchases etc)
  await sendAlgos(creator, buyer, 1e7); // 10 Algos
  await sendAlgos(creator, artist, 1e6); // 1 Algo
  
  // Create asset
  const res = await createAsset(creator);
  const assetId = res["asset-index"];
  console.log(`NFT created. Asset ID is ${assetId}`);

  const suggestedParams = await algodClient.getTransactionParams().do();

  // Txn 1: Buyer account pays 1 Algo to the creator
  let txn1 = algosdk.makePaymentTxnWithSuggestedParams(
    buyer.addr,
    creator.addr,
    1e6,
    undefined,
    undefined,
    suggestedParams
  );

  // Txn 2: Buyer opts into the asset
  let txn2 = algosdk.makeAssetTransferTxnWithSuggestedParams(
    buyer.addr,
    buyer.addr,
    undefined,
    undefined,
    0,
    undefined,
    assetId,
    suggestedParams
  );

  // Txn 3: Creator sends the NFT to the buyer
  let txn3 = algosdk.makeAssetTransferTxnWithSuggestedParams(
    creator.addr,
    buyer.addr,
    undefined,
    undefined,
    1,
    undefined,
    assetId,
    suggestedParams
  );

  // Txn 4: Creator sends 10% of the payment to the artist's account
  let txn4 = algosdk.makePaymentTxnWithSuggestedParams(
    creator.addr,
    artist.addr,
    Math.round(1e6 * 0.10), //prevent decimals
    undefined,
    undefined,
    suggestedParams
  );

  // Store txns
  let txns = [txn1, txn2, txn3, txn4];

  // Assign group ID
  let txgroup = algosdk.assignGroupID(txns);

  // Sign each transaction in the group
  const signedTxn1 = txn1.signTxn(buyer.sk); //payment
  const signedTxn2 = txn2.signTxn(buyer.sk); //optin
  const signedTxn3 = txn3.signTxn(creator.sk); //transfer
  const signedTxn4 = txn4.signTxn(creator.sk); //royalty

  // Combine the signed transactions
  let signed = [];
  signed.push(signedTxn1);
  signed.push(signedTxn2);
  signed.push(signedTxn3);
  signed.push(signedTxn4);

  // Submit to network
  try {
    await submitToNetwork(signed);
  } catch (error) {
    console.error(error.response.text);
  }

  // Check your work
  console.log("Buyer account: ", (await algodClient.accountInformation(buyer.addr).do()));
  console.log("Artist account: ", (await algodClient.accountInformation(artist.addr).do()));
})();