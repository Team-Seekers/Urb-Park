
import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-12 py-8">
      <div className="container mx-auto px-4 text-center">
        <div className="flex flex-wrap justify-center space-x-6 mb-4">
            <Link to="/" className="hover:text-yellow-500 transition-colors">About Us</Link>
            <Link to="/list-space" className="hover:text-yellow-500 transition-colors">List Your Space</Link>
            <Link to="/" className="hover:text-yellow-500 transition-colors">FAQ</Link>
            <Link to="/" className="hover:text-yellow-500 transition-colors">Contact</Link>
            <Link to="/" className="hover:text-yellow-500 transition-colors">Terms of Service</Link>
        </div>
        <p>&copy; {new Date().getFullYear()} UrbPark. All Rights Reserved.</p>
        <p className="text-sm text-gray-400 mt-1">An eco-friendly solution for modern cities.</p>
      </div>
    </footer>
  );
};

export default Footer;
