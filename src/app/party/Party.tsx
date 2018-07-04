import { UIViewInjectedProps } from '@uirouter/react';
import { $rootScope } from 'ngimport';
import * as React from 'react';
import * as io from 'socket.io-client';
import { DestinyAccount } from '../accounts/destiny-account.service';
import ErrorBoundary from '../dim-ui/ErrorBoundary';
import { Loading } from '../dim-ui/Loading';
import './party.scss';

const SERVER_URL = 'https://dim-party.herokuapp.com/';
// const SERVER_URL = 'http://localhost:3000/';

interface Props {
  account: DestinyAccount;
}

interface State {
  registeredId?: string;
  activeRoom: string;
  rooms: string[];
  users: string[];
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

  initSocket(): void {
    this.socket = io(SERVER_URL);

    this.socket.on('connect', () => {
      this.socket.emit('register', this.props.account.membershipId);
    });

    this.socket.on('time', (timeString) => {
      const time = 'Server time: ' + timeString;
      this.setState({ time });
    });

    this.socket.on('registered', (registeredId) => {
      this.setState({ registeredId });
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

  componentDidMount() {
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
    const { registeredId, activeRoom, rooms, users, time } = this.state;

    if (!registeredId) {
      return (
        <div className="party d2-party dim-page">
          <Loading />
        </div>
      );
    }

    const roomsList = rooms.map((room, i) => {
      return <button key={i} onClick={this.joinRoom.bind(this, room)}> {room} </button>;
    });

    const userList = users.map((user, i) => {
      return <li key={i}>{user}</li>;
    });

    if (activeRoom !== 'lobby') {
      return (
      <div className="party d2-party dim-page">
        <ErrorBoundary name="Party">
          <h3>{activeRoom}'s Party</h3>
          <button onClick={this.leaveRoom.bind(this, activeRoom)}>Leave Party</button>
          <h4>Party Members</h4>
          <ul>{userList}</ul>
        </ErrorBoundary>
        <div>
          {time}
        </div>
      </div>
      );
    }

    return (
      <div className="party d2-party dim-page">
        <ErrorBoundary name="Party">
          <button onClick={this.joinRoom.bind(this, registeredId)}>New Party</button>
          {roomsList}
        </ErrorBoundary>
        <div>
          {time}
        </div>
      </div>
    );
  }
}
