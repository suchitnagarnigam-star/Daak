import "./MCLHeader.css"
import mclLogo from "../assets/mcl-logo.png"

export default function MCLHeader() {
    return (
        <header className="mcl-header">
            <div className="mcl-header__logo">
                <img src={mclLogo} alt="MCL Logo" />
            </div>
            <h1 className="mcl-header__title">MCL</h1>

            {/* 
            empty div to push the title to the center 
            later we will use this space for toggling modes 
            */}

            <div className = "mcl-header-spacer"/>
        </header>
    )
}