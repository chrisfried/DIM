import * as React from 'react';
import './party.scss';
import { getProfile, BungieMembershipType } from 'bungie-api-ts/destiny2';
import { httpAdapter } from '../bungie-api/bungie-service-helper';
import { UIViewInjectedProps } from '@uirouter/react';

interface Props {
  membershipType: BungieMembershipType;
  destinyMembershipId: string;
}

interface State {
  name?: string;
}

/**
 * A party member partying hard.
 */
export default class PartyName extends React.Component<
  Props & UIViewInjectedProps,
  State
> {
  constructor(props: Props) {
    super(props);
    this.state = {
      name: 'Guardian'
    };
  }

  async getName(
    membershipType: BungieMembershipType,
    destinyMembershipId: string
  ) {
    const components = [100];
    getProfile(httpAdapter, {
      destinyMembershipId,
      membershipType,
      components
    }).then((response) => {
      const name = response.Response.profile.data.userInfo.displayName;
      this.setState({ name });
    });
  }

  componentDidMount() {
    const { membershipType, destinyMembershipId } = this.props;
    this.getName(membershipType, destinyMembershipId);
  }

  componentWillUnmount() {
    const name = 'Guardian';
    this.setState({ name });
  }

  render() {
    const { name } = this.state;

    return <h3>{name}'s Party</h3>;
  }
}
