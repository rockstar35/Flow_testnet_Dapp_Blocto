import React, { useState, useEffect } from "react"
import * as fcl from "@blocto/fcl"
import * as t from "@onflow/types"
import Card from '../components/Card'
import Header from '../components/Header'
import Code from '../components/Code'
import ownerAddress from '../owner'
const getRandomNFTTransaction = `\
import MyNFTContract from ${ownerAddress}

// This transaction is for transferring and NFT from
// one account to another

transaction(withdrawID: UInt64) {

    prepare(signer: AuthAccount) {
        if signer.borrow<&MyNFTContract.Collection>(from: MyNFTContract.CollectionStoragePath) == nil {
            // Create a new empty collection
            let collection <- MyNFTContract.createEmptyCollection()

            // save it to the account
            signer.save(<-collection, to: MyNFTContract.CollectionStoragePath) 

            // create a public capability for the collection
            signer.link<&{MyNFTContract.NFTReceiver}>(
                MyNFTContract.CollectionPublicPath,
                target: MyNFTContract.CollectionStoragePath
            ) ?? panic("Could not borrow minter reference")
        }
    
        let owner = getAccount(${ownerAddress})
        

        // borrow a public reference to the receivers collection
        let withdrawRef = owner
            .getCapability(MyNFTContract.WithdrawPublicPath)
            .borrow<&{MyNFTContract.NFTwithraw}>()
            ?? panic("Could not borrow a reference to the receiver's collection")
        
        // borrow a reference to the signer's NFT collection
        let depositRef = signer
            .borrow<&MyNFTContract.Collection>(from: MyNFTContract.CollectionStoragePath)
            ?? panic("Could not borrow a reference to the owner's collection")

        

        // withdraw the NFT from the owner's collection
        let nft <- withdrawRef.withdraw(withdrawID: withdrawID)

        // Deposit the NFT in the recipient's collection
        depositRef.deposit(token: <-nft)
    }
}
`
const scriptGetIDs = (address) => `\

import MyNFTContract from ${ownerAddress}

pub fun main() : [UInt64] {
  let nftOwner = getAccount(${ownerAddress})
  // log("NFT Owner")
  let capability = nftOwner.getCapability<&{MyNFTContract.NFTReceiver}>(MyNFTContract.CollectionPublicPath)
  
  let receiverRef = capability.borrow()
  ?? panic("Could not borrow the receiver reference")
  
  return receiverRef.getIDs()
  }
`
const GetRandomNFT = () => {
  const [status, setStatus] = useState("Not started")
  const [transaction, setTransaction] = useState(null)
  const [data, setData] = useState(null)

  useEffect(() => {
    // declare the data fetching function
  const fetchData = async () => {
    if(data !==null){
      const blockResponse = await fcl.send([
        fcl.getLatestBlock(),
      ])
  
      const block = await fcl.decode(blockResponse)
      const max = data.length;
      const rand =  Math.floor((Math.random() * max) + 0);
      var randomNumber = data[rand];
      try {
        
        const { transactionId } = await fcl.send([
          fcl.transaction(getRandomNFTTransaction),
          fcl.proposer(fcl.currentUser().authorization),
          fcl.payer(fcl.currentUser().authorization),
          fcl.authorizations([fcl.currentUser().authorization]),
          fcl.args([fcl.arg(randomNumber, t.UInt64)]),
          fcl.ref(block.id),
          fcl.limit(100),
        ])
        setStatus("Transaction sent, waiting for confirmation")
  
        const unsub = fcl
          .tx({ transactionId })
          .subscribe(transaction => {
            setTransaction(transaction)
  
            if (fcl.tx.isSealed(transaction)) {
              setStatus("Transaction is Sealed")
              unsub()
            }
          })
        //setStatus(await fcl.decode(response))
      } catch (error) {
        console.error(error);
        setStatus("Transaction failed")
      }
    }
  }

  // call the function
  fetchData()
    // make sure to catch any error
    .catch(console.error);    
  },[data]);
  const sendTransaction = async (event) => {
    event.preventDefault()

    try{
      const response = await fcl.send([
        fcl.script(scriptGetIDs()),
      ])
      await setData(await fcl.decode(response))
    }catch(error){
      console.log(error);
  
    }

    setStatus("Resolving...")

    
  }

  return (
    <Card>
      <Header>Get NFT from owner's wallet Randomly</Header>

      {/* <Code>{simpleTransaction}</Code> */}

      <button onClick={sendTransaction}>
        GetRanDomNFT
      </button>

      <Code>Status: {status}</Code>

      {transaction && <Code>{JSON.stringify(transaction, null, 2)}</Code>}
    </Card>
  )
}

export default GetRandomNFT
