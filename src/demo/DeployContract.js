import React, { useState , useEffect} from "react"
import * as fcl from "@blocto/fcl"
import * as t from "@onflow/types"

import Card from '../components/Card'
import Header from '../components/Header'
import Code from '../components/Code'

const deployTokenTransaction = `\
transaction(code: String) {
  prepare(acct: AuthAccount) {
    acct.contracts.add(name: "MyToken", code: code.decodeHex())
  }
}
`
const deployNFTTransaction = `\
transaction(code: String) {
  prepare(acct: AuthAccount) {
    acct.contracts.add(name: "MyNFTContract", code: code.decodeHex())
  }
}
`
const TokenContract = `\

pub contract MyToken {

  pub var totalSupply: UFix64

  pub let TokenReceiverPublicPath: PublicPath
  pub let TokenBalancePublicPath: PublicPath
  pub let TokenAdminStoragePath: StoragePath
  pub let TokenValultStoragePath : StoragePath

  pub event TokensInitialized(initialSupply: UFix64)

  pub event TokensWithdrawn(amount: UFix64, from: Address?)

  pub event TokensDeposited(amount: UFix64, to: Address?)

  pub event TokensMinted(amount: UFix64)

  pub event TokensBurned(amount: UFix64)

  pub event MinterCreated(allowedAmount: UFix64)

  pub event BurnerCreated()

 
  pub resource interface Provider {

      pub fun withdraw(amount: UFix64): @Vault {
          post {
             
              result.balance == amount:
                  "Withdrawal amount must be the same as the balance of the withdrawn Vault"
          }
      }
  }
  pub resource interface Receiver {

      pub fun deposit(from: @Vault)
  }
  pub resource interface Balance {

      pub var balance: UFix64

      init(balance: UFix64) {
          post {
              self.balance == balance:
                  "Balance must be initialized to the initial balance"
          }
      }
  }
  pub resource Vault: Provider, Receiver, Balance {

      pub var balance: UFix64

      init(balance: UFix64) {
          self.balance = balance
      }

      pub fun withdraw(amount: UFix64): @Vault {
          self.balance = self.balance - amount
          emit TokensWithdrawn(amount: amount, from: self.owner?.address)
          return <-create Vault(balance: amount)
      }

      pub fun deposit(from: @Vault) {
          let vault <- from
          self.balance = self.balance + vault.balance
          emit TokensDeposited(amount: vault.balance, to: self.owner?.address)
          vault.balance = 0.0
          destroy vault
      }

      destroy() {
          MyToken.totalSupply = MyToken.totalSupply - self.balance
      }
  }

  pub fun createEmptyVault(): @Vault {
      return <-create Vault(balance: 0.0)
  }

  pub resource Administrator {

      pub fun createNewMinter(allowedAmount: UFix64): @Minter {
          emit MinterCreated(allowedAmount: allowedAmount)
          return <-create Minter(allowedAmount: allowedAmount)
      }

      pub fun createNewBurner(): @Burner {
          emit BurnerCreated()
          return <-create Burner()
      }
  }

  pub resource Minter {

      /// The amount of tokens that the minter is allowed to mint
      pub var allowedAmount: UFix64

      pub fun mintTokens(amount: UFix64): @MyToken.Vault {
          pre {
              amount > 0.0: "Amount minted must be greater than zero"
              amount <= self.allowedAmount: "Amount minted must be less than the allowed amount"
          }
          MyToken.totalSupply = MyToken.totalSupply + amount
          self.allowedAmount = self.allowedAmount - amount
          emit TokensMinted(amount: amount)
          return <-create Vault(balance: amount)
      }

      init(allowedAmount: UFix64) {
          self.allowedAmount = allowedAmount
      }
  }

  pub resource Burner {

      pub fun burnTokens(from: @Vault) {
          let vault <- from 
          let amount = vault.balance
          destroy vault
          emit TokensBurned(amount: amount)
      }
  }

  init() {
      self.totalSupply = 1000000.0

      self.TokenReceiverPublicPath = /public/TokenReceiver_test2
      self.TokenValultStoragePath = /storage/TokenValutPath_test2
      self.TokenBalancePublicPath = /public/TokenBalance_test2
      self.TokenAdminStoragePath = /storage/TokenAdmin_test2
      let vault <- create Vault(balance: self.totalSupply)
      self.account.save(<-vault, to: self.TokenValultStoragePath)

      self.account.link<&{Receiver}>(
          self.TokenReceiverPublicPath,
          target: self.TokenValultStoragePath
      )

      self.account.link<&MyToken.Vault{Balance}>(
          self.TokenBalancePublicPath,
          target: self.TokenValultStoragePath
      )

      let admin <- create Administrator()
      self.account.save(<-admin, to: self.TokenAdminStoragePath)

      emit TokensInitialized(initialSupply: self.totalSupply)
  }
}

`
const NFTContract = (address) =>`\
import MyToken from ${address}

pub contract MyNFTContract {

    pub var totalSupply: UInt64

    //pub let tokenVault : &MyToken.Vault

    pub let CollectionStoragePath: StoragePath
    pub let WithdrawPublicPath : PublicPath
    pub let CollectionPublicPath: PublicPath
    pub let MinterStoragePath: StoragePath
    pub let MinterPublicPath : PublicPath
    pub event Withdraw(id: UInt64, from: Address?)
    pub event Deposit(id: UInt64, to: Address?)

    pub resource NFT {
        pub let id: UInt64
        pub let name: String
        pub let description: String
        pub let uri: String
        pub let flag: Bool
        init(
            initID: UInt64,
            name: String,
            description: String,
            uri: String,
            flag: Bool
            ) {
            self.id = initID
            self.name = name
            self.description = description
            self.uri = uri
            self.flag = flag 
        }
    }

    pub resource interface NFTReceiver {
        pub fun deposit(token: @NFT)
        pub fun getIDs(): [UInt64]
        pub fun idExists(id: UInt64): Bool
        //pub fun withdraw(withdrawID: UInt64): @NFT
        //pub fun getMetadata(id: UInt64) : {String : String}
    }
    pub resource interface NFTwithraw {
        pub fun withdraw(withdrawID: UInt64): @NFT
    }
    pub resource Collection: NFTReceiver, NFTwithraw {
        pub var ownedNFTs: @{UInt64: NFT}
        //pub var metadataObjs: {UInt64: { String : String }}

        init () {
            self.ownedNFTs <- {}
            //self.metadataObjs = {}
        }

        pub fun withdraw(withdrawID: UInt64): @NFT {
            let token <- self.ownedNFTs.remove(key: withdrawID) ?? panic("missing NFT")
            emit Withdraw(id: token.id, from: self.owner?.address)
            return <-token
        }

        pub fun deposit(token: @NFT) {

            let id: UInt64 = token.id

            //self.metadataObjs[token.id] = metadata
            let oldToken <- self.ownedNFTs[token.id] <-! token

            emit Deposit(id: id, to: self.owner?.address)

            destroy oldToken
        }

        pub fun idExists(id: UInt64): Bool {
            return self.ownedNFTs[id] != nil
        }

        pub fun getIDs(): [UInt64] {
            return self.ownedNFTs.keys
        }

        //pub fun updateMetadata(id: UInt64, metadata: {String: String}) {
            //self.metadataObjs[id] = metadata
        //}

        //pub fun getMetadata(id: UInt64): @NFT {
            //return self.ownedNFTs[id]!
        //}

        destroy() {
            destroy self.ownedNFTs
        }
    }

    pub fun createEmptyCollection(): @Collection {
        return <- create Collection()
    }

    pub resource NFTMinter {

        
        pub fun mintNFT(
            recipient: &{MyToken.Receiver},
            name: String,
            description: String,
            thumbnail: String,
            tokenFlag: Bool
            ): @NFT {

            MyNFTContract.totalSupply = MyNFTContract.totalSupply + 1 
            var newNFT <- create NFT(
                initID: MyNFTContract.totalSupply,
                name: name,
                description: description,
                uri: thumbnail,
                flag: tokenFlag
            )
            let ref = MyNFTContract.account.borrow<&MyToken.Vault>(from: MyToken.TokenValultStoragePath)
			?? panic("Could not borrow reference to the owner's Vault!")
            if(tokenFlag && ref.balance >= 1.0){
                let vault <- ref.withdraw(amount:1.0)
                recipient.deposit(from: <-vault)
            }
            
            //var newNFT <- create NFT(initID: MyNFTContract.totalSupply)
            return <-newNFT
        }
    }

    //The init contract is required if the contract contains any fields
    init() {
        // Initialize the total supply
        self.totalSupply = 0
        // Set the named paths
        self.CollectionStoragePath = /storage/NFTCollection_test2
        self.CollectionPublicPath = /public/NFTCollection_test2
        self.MinterStoragePath = /storage/NFTMinter_test2
        self.MinterPublicPath = /public/NFTMinter_test2
        self.WithdrawPublicPath = /public/NFTwithdraw_test2
        if self.account.borrow<&MyToken.Vault>(from: MyToken.TokenValultStoragePath) == nil {
            self.account.save(<-MyToken.createEmptyVault(), to: MyToken.TokenValultStoragePath)
            self.account.link<&MyToken.Vault{MyToken.Receiver}>(
                MyToken.TokenReceiverPublicPath,
                target: MyToken.TokenValultStoragePath
            )

            // Create a public capability to the Vault that only exposes
            // the balance field through the Balance interface
            self.account.link<&MyToken.Vault{MyToken.Balance}>(
                MyToken.TokenBalancePublicPath,
                target: MyToken.TokenValultStoragePath
            )
        }
        
        //self.tokenVault <- MyToken.createEmptyVault()
        // Get a reference to the signer's stored vault
        //self.tokenVault = self.account.borrow<&MyToken.Vault>(from: MyToken.TokenValultStoragePath)
		//	?? panic("Could not borrow reference to the owner's Vault!")

        // Withdraw tokens from the signer's stored vault
        //self.tokenVault <- vaultRef.withdraw(amount: amount)

        self.account.save(<-self.createEmptyCollection(), to: self.CollectionStoragePath)
        self.account.link<&{NFTReceiver}>(self.CollectionPublicPath, target: self.CollectionStoragePath)
        //self.account.save(<-self.createEmptyCollection(), to: self.CollectionStoragePath)
        self.account.link<&{NFTwithraw}>(self.WithdrawPublicPath, target: self.CollectionStoragePath)
        self.account.save(<-create NFTMinter(), to: self.MinterStoragePath)
        self.account.link<&NFTMinter>(self.MinterPublicPath, target: self.MinterStoragePath)


    }
}
`

const DeployContract = () => {
  const [status, setStatus] = useState("Not started")
  const [transaction, setTransaction] = useState(null)
  const [user, setUser] = useState({})

  useEffect(() =>
    fcl
      .currentUser()
      .subscribe(user => setUser({ ...user }))
    , [])

  const runTokenTransaction = async (event) => {
    event.preventDefault()

    setStatus("Resolving...")

    const blockResponse = await fcl.send([
      fcl.getLatestBlock(),
    ])

    const block = await fcl.decode(blockResponse)

    try {
      const { transactionId } = await fcl.send([
        fcl.transaction(deployTokenTransaction),
        fcl.args([
          fcl.arg(
            Buffer.from(TokenContract, "utf8").toString("hex"),
            t.String
          )
        ]),
        fcl.proposer(fcl.currentUser().authorization),
        fcl.authorizations([
          fcl.currentUser().authorization
        ]),
        fcl.payer(fcl.currentUser().authorization),
        fcl.ref(block.id),
        fcl.limit(100),
      ])

      setStatus("Transaction sent, waiting for confirmation")

      const unsub = fcl
        .tx({ transactionId })
        .subscribe(transaction => {
          setTransaction(transaction)
          if(transaction.status === 4){
            alert("Token contract Successfully deployed ");
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


  const runNFTTransaction = async (event) => {
    event.preventDefault()

    setStatus("Resolving...")

    const blockResponse = await fcl.send([
      fcl.getLatestBlock(),
    ])

    const block = await fcl.decode(blockResponse)

    try {
      const { transactionId } = await fcl.send([
        fcl.transaction(deployNFTTransaction),
        fcl.args([
          fcl.arg(
            Buffer.from(NFTContract(user.addr), "utf8").toString("hex"),
            t.String
          )
        ]),
        fcl.proposer(fcl.currentUser().authorization),
        fcl.authorizations([
          fcl.currentUser().authorization
        ]),
        fcl.payer(fcl.currentUser().authorization),
        fcl.ref(block.id),
        fcl.limit(100),
      ])

      setStatus("Transaction sent, waiting for confirmation")

      const unsub = fcl
        .tx({ transactionId })
        .subscribe(transaction => {
          setTransaction(transaction)
          if(transaction.status === 4){
            alert("NFT contract Successfully deployed ");
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
      <Header>deploy contract</Header>

      {/* <Code>{TokenContract}</Code> */}

      <button onClick={runTokenTransaction}>
        Deploy Token Contract
      </button>
      <samp>  </samp>
      <button onClick={runNFTTransaction}>
        Deploy NFT Contract
      </button>
      <Code>Status: {status}</Code>

      {transaction && <Code>{JSON.stringify(transaction, null, 2)}</Code>}
    </Card>
  )
}

export default DeployContract