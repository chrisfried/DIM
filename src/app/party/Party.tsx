import { UIViewInjectedProps } from '@uirouter/react';
import { $rootScope } from 'ngimport';
import * as React from 'react';
import * as io from 'socket.io-client';
import { DestinyAccount } from '../accounts/destiny-account.service';
import ErrorBoundary from '../dim-ui/ErrorBoundary';
import { Loading } from '../dim-ui/Loading';
import './party.scss';
import PartyMember from './PartyMember';
import PartyName from './PartyName';
import {
  D2ManifestDefinitions,
  getDefinitions
} from '../destiny2/d2-definitions.service';
import { D2ManifestService } from '../manifest/manifest-service';
import { BungieMembershipType } from 'bungie-api-ts/user';

// const SERVER_URL = 'https://dim-party.herokuapp.com/';
const SERVER_URL = 'http://localhost:3000/';

interface Props {
  account: DestinyAccount;
}

interface State {
  defs?: D2ManifestDefinitions;
  registeredId?: string;
  registeredType?: BungieMembershipType;
  activeRoom: string;
  rooms: string[];
  users: {
    membershipType: BungieMembershipType;
    destinyMembershipId: string;
  }[];
  time?: string;
}

/**
 * The party screen for partying hard.
 */
export default class Party extends React.Component<
  Props & UIViewInjectedProps,
  State
> {
  private $scope = $rootScope.$new(true);

  private socket: SocketIOClient.Socket;

  constructor(props: Props) {
    super(props);
    this.state = {
      activeRoom: 'lobby',
      rooms: [],
      users: []
    };
  }

  initSocket() {
    this.socket = io(SERVER_URL);

    this.socket.on('connect', () => {
      this.socket.emit('register', {
        membershipType: this.props.account.platformType,
        destinyMembershipId: this.props.account.membershipId
      });
    });

    this.socket.on('disconnect', () => {
      const registeredId = '';
      const registeredType = -1;
      this.setState({ registeredId, registeredType });
    });

    this.socket.on('time', (timeString) => {
      const time = 'Server time: ' + timeString;
      this.setState({ time });
    });

    this.socket.on('registered', ({ registeredType, registeredId }) => {
      this.setState({ registeredType, registeredId });
      this.joinRoom(this.state.activeRoom || 'lobby');
    });

    this.socket.on('emitRooms', (rooms) => {
      this.setState({ rooms });
    });

    this.socket.on('joinedRoom', (activeRoom) => {
      const users = [];
      this.setState({ activeRoom, users });
    });

    this.socket.on('emitUsers', (users) => {
      this.setState({ users });
    });
  }

  async loadParty() {
    const defs = await getDefinitions();
    D2ManifestService.loaded = true;
    this.setState({ defs });
  }

  componentDidMount() {
    this.loadParty();
    this.initSocket();
  }

  componentWillUnmount() {
    this.socket.disconnect();
    this.$scope.$destroy();
  }

  joinRoom(room: string) {
    this.socket.emit('joinRoom', room);
  }

  leaveRoom(room: string) {
    this.socket.emit('leaveRoom', room);
  }

  render() {
    const {
      defs,
      registeredId,
      registeredType,
      activeRoom,
      rooms,
      users,
      time
    } = this.state;

    if (!defs || !registeredId || !registeredType || !activeRoom) {
      return (
        <div className="party d2-party dim-page">
          <Loading />
        </div>
      );
    }

    const roomsList = rooms.map((room) => {
      return (
        <button key={room} onClick={this.joinRoom.bind(this, room)}>
          {room}
        </button>
      );
    });

    if (activeRoom !== 'lobby') {
      return (
        <div className="party d2-party dim-page">
          <ErrorBoundary name="Party">
            <PartyName
              membershipType={this.props.account.platformType}
              destinyMembershipId={activeRoom}
            />
            <button onClick={this.leaveRoom.bind(this, activeRoom)}>
              Leave Party
            </button>
            <h4>Party Members</h4>
            <ul>
              {users.map((user) => (
                <PartyMember
                  membershipType={user.membershipType}
                  destinyMembershipId={user.destinyMembershipId}
                  key={user.destinyMembershipId}
                />
              ))}
            </ul>
          </ErrorBoundary>
          <div>{time}</div>
        </div>
      );
    }

    return (
      <div className="party d2-party dim-page">
        <ErrorBoundary name="Party">
          <button onClick={this.joinRoom.bind(this, registeredId)}>
            New Party
          </button>
          {roomsList}
        </ErrorBoundary>
        <div>{time}</div>
      </div>
    );
  }
}
