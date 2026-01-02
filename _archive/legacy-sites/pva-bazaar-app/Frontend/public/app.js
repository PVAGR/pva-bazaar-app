Here are the contents for the file `Frontend/public/app.js`:

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Home from './components/Home';
import Journal from './components/Journal';
import About from './components/About';
import Search from './components/Search';

const App = () => (
    <Router>
        <Switch>
            <Route path="/" exact component={Home} />
            <Route path="/journal" component={Journal} />
            <Route path="/about" component={About} />
            <Route path="/search" component={Search} />
        </Switch>
    </Router>
);

ReactDOM.render(<App />, document.getElementById('root'));