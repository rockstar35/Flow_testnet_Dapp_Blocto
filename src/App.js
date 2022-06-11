import React from 'react';
import styled from 'styled-components'

import Section from './components/Section'
import Header from './components/Header'

// import GetLatestBlock from './demo/GetLatestBlock'
//import GetAccount from './demo/GetAccount'
import GetNFTIDs from "./demo/GetNFTIDs"
import GetTokenBalance from "./demo/GetTokenBalance"
import Authenticate from './demo/Authenticate'
//import UserInfo from './demo/UserInfo'
import SetAccount from './demo/SetAccount'
import GetRandomNFT from './demo/GetRandomNFT'
import DeployContract from './demo/DeployContract'
import NFTmint from './demo/NFTmint';

const Wrapper = styled.div`
  font-size: 13px;
  font-family: Arial, Helvetica, sans-serif;
`;

function App() {
  return (
    <Wrapper>
      <Section>
        <Header>Information Getting Scripts</Header>
        {/* <GetLatestBlock /> */}
        {/* <GetAccount /> */}
        <SetAccount />
        <GetNFTIDs />
        <GetTokenBalance/>
        {/* <ScriptTwo /> */}
      </Section>

      <Section>
        <Header>Blocto wallet Sign and NFT Mint</Header>
        <Authenticate />
        {/* <UserInfo /> */}
        <NFTmint/>
        <GetRandomNFT/>
        <DeployContract />
        {/* <InteractWithContract /> */}
      </Section>
    </Wrapper>
  );
}

export default App;
