// src/dynamic-app/components/footer.jsx
import { Link } from 'react-router-dom';

const Footer = ({ customArrowIcon2, linkArrowIcon }) => {
  return (
    <footer className="footer">
      <div className="footer-links">
        <div className="nav-item">
          <div className="nav-link-2" role="button" tabIndex={0}>
            <div className="name">
              <h4>What is DMI?</h4>
            </div>
            {customArrowIcon2 && (
              <div
                className="arrow3"
                dangerouslySetInnerHTML={{ __html: customArrowIcon2 }}
              />
            )}
          </div>
        </div>
        <div className="nav-item">
          <div className="nav-link-2" role="button" tabIndex={0}>
            <h4>Case Studies</h4>
            {customArrowIcon2 && (
              <div
                className="arrow3"
                dangerouslySetInnerHTML={{ __html: customArrowIcon2 }}
              />
            )}
          </div>
        </div>
      </div>
      <div className="footer-info">
        <div className="nav-item">
          <a
            href="https://www.linkedin.com/in/efe-ozalp/" 
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link-2"
          >
            <h4>Developed by Efe Ozalp</h4>
            {linkArrowIcon && (
              <div
                id="link-arrow"
                className="arrow3"
                dangerouslySetInnerHTML={{ __html: linkArrowIcon }}
              />
            )}
          </a>
        </div>
        <div className="nav-item">
          <a
            href="https://www.instagram.com/yxuart/"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link-2"
          >
            <h4>Illustrations by Yiner Xu @yxuart</h4>
            {linkArrowIcon && (
              <div
                id="link-arrow"
                className="arrow3"
                dangerouslySetInnerHTML={{ __html: linkArrowIcon }}
              />
            )}
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
