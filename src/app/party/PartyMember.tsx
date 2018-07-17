import * as React from 'react';
import * as _ from 'underscore';
import './party.scss';
import {
  getProfile,
  BungieMembershipType,
  DestinyProfileResponse
} from 'bungie-api-ts/destiny2';
import { httpAdapter } from '../bungie-api/bungie-service-helper';
import { UIViewInjectedProps } from '@uirouter/react';

interface Props {
  membershipType: BungieMembershipType;
  destinyMembershipId: string;
}

interface State {
  name?: string;
  profileResponse?: DestinyProfileResponse;
  activeCharacterId?: string;
}

/**
 * A party member partying hard.
 */
export default class PartyMember extends React.Component<
  Props & UIViewInjectedProps,
  State
> {
  constructor(props: Props) {
    super(props);
    this.state = {
      name: 'Guardian'
    };
  }

  async getGuardian() {
    const { membershipType, destinyMembershipId } = this.props;
    const components = [100, 102, 200, 201, 205];
    getProfile(httpAdapter, {
      destinyMembershipId,
      membershipType,
      components
    }).then((response) => {
      const name = response.Response.profile.data.userInfo.displayName;
      const profileResponse = response.Response;
      const characterInventories = profileResponse.characterInventories;
      const profileInventory = profileResponse.profileInventory;
      let lastPlayed: string = '';
      let activeCharacterId: string = '';
      _.each(profileResponse.characters.data, (character) => {
        if (!activeCharacterId) {
          lastPlayed = character.dateLastPlayed;
          activeCharacterId = character.characterId;
        } else if (character.dateLastPlayed > lastPlayed) {
          lastPlayed = character.dateLastPlayed;
          activeCharacterId = character.characterId;
        }
      });
      console.log(characterInventories.data, profileInventory.data);
      this.setState({
        name,
        profileResponse,
        activeCharacterId
      });
    });
  }

  componentDidMount() {
    this.getGuardian();
  }

  componentWillUnmount() {
    const name = 'Guardian';
    const profileResponse = undefined;
    this.setState({ name, profileResponse });
  }

  render() {
    const { destinyMembershipId } = this.props;
    const { name, profileResponse, activeCharacterId } = this.state;

    let equipmentList;
    let inventoryList;
    if (profileResponse && activeCharacterId) {
      equipmentList = profileResponse.characterEquipment.data[
        activeCharacterId
      ].items.map((item) => {
        return <li key={item.itemInstanceId}>{item.itemHash}</li>;
      });
      try {
        inventoryList = profileResponse.characterInventories.data[
          activeCharacterId
        ].items.map((item) => {
          if (item.itemInstanceId) {
            return <li key={item.itemInstanceId}>{item.itemHash}</li>;
          }
        });
      } catch (e) {
        //
      }
    }

    return (
      <li key={destinyMembershipId}>
        {name}
        <h5>Equipment</h5>
        <ul>{equipmentList}</ul>
        <h5>Inventory</h5>
        <ul>{inventoryList}</ul>
      </li>
    );
  }
}
