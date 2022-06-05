import React, {useState} from "react"
import * as fcl from "@blocto/fcl"
import * as t from "@onflow/types"

import Card from '../components/Card'
import Header from '../components/Header'
import Code from '../components/Code'
import ownerAddress from '../owner'
const simpleTransaction = `\

import MyNFTContract from ${ownerAddress}
import MyToken from ${ownerAddress}

transaction( _name: String,
    _description: String,
    _uri: String,
    _token_flag: Bool) {

    let receiverRef: &{MyNFTContract.NFTReceiver}
    let minterRef: &MyNFTContract.NFTMinter
    let receiverToken: &{MyToken.Receiver}

    prepare(acct: AuthAccount) {

        let account = getAccount(${ownerAddress})

        if acct.borrow<&MyToken.Vault>(from: MyToken.TokenValultStoragePath) == nil {
            // Create a new ExampleToken Vault and put it in storage
            acct.save(
                <-MyToken.createEmptyVault(),
                to: MyToken.TokenValultStoragePath
            )

            // Create a public capability to the Vault that only exposes
            // the deposit function through the Receiver interface
            acct.link<&MyToken.Vault{MyToken.Receiver}>(
                MyToken.TokenReceiverPublicPath,
                target: MyToken.TokenValultStoragePath
            )

            // Create a public capability to the Vault that only exposes
            // the balance field through the Balance interface
            acct.link<&MyToken.Vault{MyToken.Balance}>(
                MyToken.TokenBalancePublicPath,
                target: MyToken.TokenValultStoragePath
            )
        }
        if acct.borrow<&MyNFTContract.Collection>(from: MyNFTContract.CollectionStoragePath) == nil {
                    // Create a new empty collection
            let collection <- MyNFTContract.createEmptyCollection()

            // save it to the account
            acct.save(<-collection, to: MyNFTContract.CollectionStoragePath) 

            // create a public capability for the collection
            acct.link<&{MyNFTContract.NFTReceiver}>(
                MyNFTContract.CollectionPublicPath,
                target: MyNFTContract.CollectionStoragePath
            ) ?? panic("Could not borrow minter reference")
                
        }

                
        self.receiverRef = acct.getCapability<&{MyNFTContract.NFTReceiver}>(MyNFTContract.CollectionPublicPath)
        .borrow() ?? panic("Could not borrow minter reference")

        self.minterRef = account.getCapability<&MyNFTContract.NFTMinter>(MyNFTContract.MinterPublicPath)
        .borrow()
        ?? panic("Could not borrow minter reference")

        
        self.receiverToken = acct.getCapability<&{MyToken.Receiver}>(MyToken.TokenReceiverPublicPath)
            .borrow()
            ?? panic("Could not get receiver reference to the NFT Collection")

    }

    execute {

        //let _name = "AllCode Logo"
        //let _description = "Fillmore Street"
        //let _uri = "ipfs://QmVH5T7MFVU52hTfQdWvu73iFPEF3jizuGfyVLccTmBCX2"
        let newNFT <- self.minterRef.mintNFT(
                    recipient: self.receiverToken,
                    name: _name,
                    description: _description,
                    thumbnail: _uri,
                    tokenFlag: _token_flag)

        self.receiverRef.deposit(token: <-newNFT)

        log("NFT Minted and deposited to Account 2’s Collection")
    }
}
`

const NFTmint = () => {
  const [status, setStatus] = useState("Not started")
  const [transaction, setTransaction] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [uri, setURI] = useState('')
  const [flag, setFlag] = useState(true)

  const updateName = (event) => {
    event.preventDefault();

    setName(event.target.value)
  }
  const updateDescription = (event) => {
    event.preventDefault();

    setDescription(event.target.value)
  }
  const updateURI = (event) => {
    event.preventDefault();

    setURI(event.target.value)
  }
  const updateFlag = (event) => {
    event.preventDefault();
    //setFlag(event.target.value)
    if(event.target.value === "true"){
      setFlag(true)
    }else{
      setFlag(false)
    }
  }

  const sendTransaction = async (event) => {
    event.preventDefault()

    setName()
    setStatus("Resolving...")

    setAccountNFT()

    setAccountToken()

    sendMintTransaction()
  
  }

  const setAccountNFT = async() => {
    
  }

  const setAccountToken = async() =>{

  }

  const sendMintTransaction = async() => {
    try {
      const { transactionId } = await fcl.send([
        fcl.transaction(simpleTransaction),
        fcl.proposer(fcl.currentUser().authorization),
        fcl.payer(fcl.currentUser().authorization),
        fcl.authorizations([fcl.currentUser().authorization]),
        fcl.args([fcl.arg(name, t.String),fcl.arg(description, t.String),fcl.arg(uri, t.String),fcl.arg(flag, t.Bool)]),
        fcl.limit(100),
      ])

      setStatus("Transaction sent, waiting for confirmation...")
      setName("");
      setDescription("");
      setURI("");
      setFlag(true);
      const unsub = fcl
        .tx({ transactionId })
        .subscribe(transaction => {
          setTransaction(transaction)
          if(transaction.status === 4){
            alert("congrats on your creating NFT.");
          }
          
          if (fcl.tx.isSealed(transaction)) {
            setStatus("Transaction is Sealed")
            unsub()
          }
        })
    } catch (error) {
      console.error(error);
      setStatus("Transaction failed")
    }
  }

  return (
    <Card>
      <Header>Send NFT Mint transaction</Header>

      {/* <Code>{simpleTransaction}</Code> */}

      <div className="container">
        <form action="">
        <div className="row">
          <div className="col-25">
            <label>Name</label>
          </div>
          <div className="col-75">
            <input type="text" id="name" name="name" onChange={updateName} placeholder="NFT name.."/>
          </div>
        </div>
        <div className="row">
          <div className="col-25">
            <label>Description</label>
          </div>
          <div className="col-75">
            <input type="text" id="description" name="description" onChange={updateDescription} placeholder="NFT description"/>
          </div>
        </div>
        <div className="row">
          <div className="col-25">
            <label>URL</label>
          </div>
          <div className="col-75">
            <input type="text" id="url" name="url" onChange={updateURI} placeholder="NFT url.."/>
          </div>
        </div>
        <div className="row">
          <div className="col-25">
            <label>You want our one Token</label>
          </div>
          <div className="col-75">
            <select id="token" name="country" onChange={updateFlag}>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>
        <br/>
        <div className="row">
          <input onClick={sendTransaction} type="button" value="Create" />
        </div>
        </form>
      </div>
      <Code>Status: {status}</Code>
      {transaction && <Code>{JSON.stringify(transaction, null, 2)}</Code>}
    </Card>
  )
}

export default NFTmint
