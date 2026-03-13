import React, { useEffect, useState } from 'react';
import { getScheduleByType } from '../api/cricapi';
import BackButton from '../components/BackButton';
import Loader from '../components/Loader';
import './Css/schedule.css';

export default function Schedule() {
    const [scheduleData, setScheduleData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab] = useState('international');

    useEffect(() => {
        const fetchSchedule = async () => {
            try {
                setLoading(true);
                // Map tab names to API types if necessary, but here they match mostly
                const { data } = await getScheduleByType(activeTab);
                console.log("Schedule Data:", data);

                // Process the data: The API likely returns matchScheduleMap
                // We need to flatten it or group it by date properly.
                // Assuming data.matchScheduleMap is an array of objects with 'scheduleAdWrapper' and 'date'

                let processedData = [];
                if (data && data.matchScheduleMap) {
                    processedData = data.matchScheduleMap.filter(group => group.scheduleAdWrapper)
                        .map(group => {
                            const date = group.scheduleAdWrapper.date;
                            const matches = [];

                            if (group.scheduleAdWrapper.matchScheduleList) {
                                group.scheduleAdWrapper.matchScheduleList.forEach(seriesItem => {
                                    if (seriesItem.matchInfo) {
                                        seriesItem.matchInfo.forEach(match => {
                                            matches.push({
                                                ...match,
                                                seriesName: seriesItem.seriesName || match.seriesName
                                            });
                                        });
                                    } else if (seriesItem.matchId) {
                                        // Handle case if item is directly a match (fallback)
                                        matches.push(seriesItem);
                                    }
                                });
                            }

                            return { date, matches };
                        });
                } else if (data && data.source && data.source.includes('fallback')) {
                    console.log("Using Fallback UI data.");
                }

                setScheduleData(processedData);
            } catch (err) {
                console.error("Error fetching schedule:", err);
                setError("Failed to load schedule. Using offline fallback if possible, otherwise please try again later.");
            } finally {
                setLoading(false);
            }
        };

        fetchSchedule();
    }, [activeTab]);



    if (loading) return <Loader message="Loading International Schedule..." />;

    if (error) return (
        <div className="error-container">
            <div className="error-message">{error}</div>
        </div>
    );

    return (
        <div className="schedule-page-wrapper">
            <BackButton />
            <div className="schedule-container">
                <header className="schedule-header">
                    <h1>Cricket Schedule</h1>
                    <p>Upcoming Matches Worldwide</p>

                    {/* Tabs removed as per request */}
                </header>

                <div className="schedule-list">
                    {scheduleData.length > 0 ? (
                        scheduleData.map((group, index) => (
                            <div key={index} className="schedule-group">
                                <div className="group-date">{group.date}</div>
                                {group.matches.map((match) => (
                                    <div key={match.matchId} className="match-card">
                                        <div className="match-info-left">
                                            <div className="series-name">{match.seriesName}</div>
                                            <div className="match-title">{match.team1?.teamName} vs {match.team2?.teamName}, {match.matchDesc}</div>
                                            <div className="match-venue">{match.venueInfo?.ground}, {match.venueInfo?.city}</div>
                                        </div>
                                        <div className="match-time-badge">
                                            {new Date(parseInt(match.startDate)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                ))}
                                {group.matches.length === 0 && <p>No matches scheduled for this date.</p>}
                            </div>
                        ))
                    ) : (
                        <div className="no-data">No schedule data available.</div>
                    )}
                </div>
            </div>
        </div>
    );
};