import React, { useState, useEffect } from "react"
import * as fcl from "@onflow/fcl"

import Card from '../components/Card'
import Header from '../components/Header'
import Code from '../components/Code'
import ownerAddress from '../owner'
const scriptGetToken = (address) => `\

import MyToken from ${ownerAddress}

  pub fun main(): UFix64 {
      let acct = getAccount(${address})
      let vaultRef = acct.getCapability(MyToken.TokenBalancePublicPath)
          .borrow<&MyToken.Vault{MyToken.Balance}>()
          ?? panic("Could not borrow Balance reference to the Vault")
  
      return vaultRef.balance
  }
`

export default function GetTokenBalance() {
  const [data, setData] = useState(null)
  const [user, setUser] = useState({})

  useEffect(() =>
    fcl
      .currentUser()
      .subscribe(user => setUser({ ...user }))
    , [])
  const NFTOwnerAddress = user.addr;
  const runScript = async (event) => {
    event.preventDefault()
    if(user.addr === null){
      alert("Please sign in.");
      return;
    }
    try{
      const response = await fcl.send([
        fcl.script(scriptGetToken(NFTOwnerAddress)),
      ])
      
      setData(await fcl.decode(response))
    }catch(error){
      alert("Please set token account. \n In Flow net work, First User set account that stores tokens in user's account.");
    }
    
  }

  return (
    <Card>
      <Header>Get Current taken balance</Header>
      
      {/* <Code>{scriptGetToken(NFTOwnerAddress)}</Code> */}
      
      <button onClick={runScript}>get Token balance</button>

      {data && (
        <Code>
          {JSON.stringify(data, null, 2)}
        </Code>
      )}
    </Card>
  )
}
