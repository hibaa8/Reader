import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './Home';
import BookDetails from './components/BookDetails';
import AuthPage from './components/AuthPage';
import { LibraryProvider } from './LibraryContext';

const App = () => {
    return (
        <Router>
            <LibraryProvider>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/book/:id" element={<BookDetails />} />
                    <Route path="/login" element={<AuthPage mode="login" />} />
                    <Route path="/signup" element={<AuthPage mode="signup" />} />
                </Routes>
            </LibraryProvider>
        </Router>
    );
};

export default App;
