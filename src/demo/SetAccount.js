import React, { useState } from "react"
import * as fcl from "@blocto/fcl"

import Card from '../components/Card'
import Header from '../components/Header'
import Code from '../components/Code'
import ownerAddress from '../owner'
const sendAccountTransaction = `\
import MyToken from ${ownerAddress}
import MyNFTContract from ${ownerAddress}
transaction {

    prepare(signer: AuthAccount) {

        // Return early if the account already stores a ExampleToken Vault
        if signer.borrow<&MyToken.Vault>(from: MyToken.TokenValultStoragePath) == nil {
            // Create a new ExampleToken Vault and put it in storage
            signer.save(
                <-MyToken.createEmptyVault(),
                to: MyToken.TokenValultStoragePath
            )

            // Create a public capability to the Vault that only exposes
            // the deposit function through the Receiver interface
            signer.link<&MyToken.Vault{MyToken.Receiver}>(
                MyToken.TokenReceiverPublicPath,
                target: MyToken.TokenValultStoragePath
            )

            // Create a public capability to the Vault that only exposes
            // the balance field through the Balance interface
            signer.link<&MyToken.Vault{MyToken.Balance}>(
                MyToken.TokenBalancePublicPath,
                target: MyToken.TokenValultStoragePath
            )
        }
        
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
    }
}
`

const SetAccount = () => {
  const [status, setStatus] = useState("Not started")
  const [transaction, setTransaction] = useState(null)

  const sendTransaction = async (event) => {
    event.preventDefault()

    setStatus("Resolving...")

    const blockResponse = await fcl.send([
      fcl.getLatestBlock(),
    ])

    const block = await fcl.decode(blockResponse)

    try {
      const { transactionId } = await fcl.send([
        fcl.transaction(sendAccountTransaction),
        fcl.proposer(fcl.currentUser().authorization),
        fcl.payer(fcl.currentUser().authorization),
        fcl.authorizations([fcl.currentUser().authorization]),
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

  return (
    <Card>
      <Header>set token and NFT account in user's wallet</Header>

      {/* <Code>{simpleTransaction}</Code> */}

      <button onClick={sendTransaction}>
        SetToken&NFTAccount
      </button>

      <Code>Status: {status}</Code>

      {transaction && <Code>{JSON.stringify(transaction, null, 2)}</Code>}
    </Card>
  )
}

export default SetAccount
