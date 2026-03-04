import React from 'react';
import './infrastructure/styles/PapiwebSpinner.css';

const PapiwebSpinner = () => {
    return (
        <div className="papiweb-spinner-wrapper">
            <div className="papiweb-spinner-circle"></div>
            <div className="papiweb-spinner-text">
                PAPIWEB
            </div>
        </div>
    );
};

export default PapiwebSpinner;
